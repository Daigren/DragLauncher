import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { shell } from 'electron';

export interface JavaInstallation {
  path: string;
  majorVersion: number;
  versionString: string;
  is64Bit: boolean;
}

export class JavaDetector {
  public detectJavaInstallations(): JavaInstallation[] {
    const candidatePaths = new Set<string>();

    // 1. PATH java
    try {
      const whereOutput = execSync('where java', { encoding: 'utf8' });
      for (const line of whereOutput.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && fs.existsSync(trimmed)) {
          candidatePaths.add(trimmed);
        }
      }
    } catch (e) {
      // where failed
    }

    // 2. JAVA_HOME
    if (process.env.JAVA_HOME) {
      const jhPath = path.join(process.env.JAVA_HOME, 'bin', 'java.exe');
      if (fs.existsSync(jhPath)) {
        candidatePaths.add(jhPath);
      }
    }

    // 3. Known directories on Windows
    const searchRoots = [
      'C:\\Program Files\\Java',
      'C:\\Program Files (x86)\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\Amazon Corretto',
      'C:\\Program Files\\Zulu',
    ];

    for (const root of searchRoots) {
      if (fs.existsSync(root)) {
        try {
          const subdirs = fs.readdirSync(root, { withFileTypes: true });
          for (const s of subdirs) {
            if (s.isDirectory()) {
              const exe = path.join(root, s.name, 'bin', 'java.exe');
              if (fs.existsSync(exe)) {
                candidatePaths.add(exe);
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    const results: JavaInstallation[] = [];
    for (const binPath of candidatePaths) {
      const info = this.inspectJava(binPath);
      if (info) {
        results.push(info);
      }
    }

    return results;
  }

  public inspectJava(binPath: string): JavaInstallation | null {
    try {
      const out = execSync(`"${binPath}" -version 2>&1`, { encoding: 'utf8' });
      // Example output:
      // openjdk version "21.0.2" 2024-01-16
      // java version "1.8.0_361"
      const match = out.match(/(?:java|openjdk) version "([^"]+)"/i);
      const versionString = match ? match[1] : 'Unknown';

      let majorVersion = 0;
      if (versionString.startsWith('1.')) {
        majorVersion = parseInt(versionString.split('.')[1] || '8', 10);
      } else {
        majorVersion = parseInt(versionString.split('.')[0] || '0', 10);
      }

      const is64Bit = out.includes('64-Bit') || out.includes('x86_64') || out.includes('amd64');

      return {
        path: binPath,
        majorVersion: majorVersion || 8,
        versionString,
        is64Bit,
      };
    } catch (e) {
      return null;
    }
  }

  public getRequiredJavaVersion(mcVersion: string): number {
    const parts = mcVersion.split('.').map((p) => parseInt(p, 10));
    const major = parts[0] || 0;
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    // Modern snapshots or calendar versioning like 26.3
    if (major >= 20) return 21;
    // MC 1.20.5+ requires Java 21+
    if (minor > 20 || (minor === 20 && patch >= 5)) return 21;
    // MC 1.17 - 1.20.4 requires Java 17
    if (minor >= 17) return 17;
    // MC <= 1.16.5 requires Java 8
    return 8;
  }

  public checkJavaCompatibility(
    mcVersion: string,
    customJavaPath?: string
  ): {
    valid: boolean;
    requiredMajor: number;
    foundJava?: JavaInstallation;
    installedVersions: JavaInstallation[];
    reason?: 'missing' | 'too_old' | 'not_found';
  } {
    const requiredMajor = this.getRequiredJavaVersion(mcVersion);
    const installed = this.detectJavaInstallations();

    if (customJavaPath && customJavaPath !== 'java') {
      const inspected = this.inspectJava(customJavaPath);
      if (!inspected) {
        return {
          valid: false,
          requiredMajor,
          installedVersions: installed,
          reason: 'not_found',
        };
      }
      if (inspected.majorVersion < requiredMajor) {
        return {
          valid: false,
          requiredMajor,
          foundJava: inspected,
          installedVersions: installed,
          reason: 'too_old',
        };
      }
      return {
        valid: true,
        requiredMajor,
        foundJava: inspected,
        installedVersions: installed,
      };
    }

    if (installed.length === 0) {
      return {
        valid: false,
        requiredMajor,
        installedVersions: [],
        reason: 'missing',
      };
    }

    const compatible = installed.find((j) => j.majorVersion >= requiredMajor);
    if (!compatible) {
      return {
        valid: false,
        requiredMajor,
        installedVersions: installed,
        reason: 'too_old',
      };
    }

    return {
      valid: true,
      requiredMajor,
      foundJava: compatible,
      installedVersions: installed,
    };
  }

  public async downloadAndRunJavaInstaller(
    majorVersion: number,
    onProgress: (pct: number) => void
  ): Promise<string> {
    const targetMajor = [8, 17, 21].includes(majorVersion) ? majorVersion : 21;
    const url = `https://api.adoptium.net/v3/installer/latest/${targetMajor}/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk`;
    const tempDir = process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp';
    const msiPath = path.join(tempDir, `Temurin_Java_${targetMajor}_Installer.msi`);

    onProgress(5);
    const resp = await fetch(url, { redirect: 'follow' });
    if (!resp.ok) {
      throw new Error(`Ошибка загрузки установщика Java: ${resp.statusText}`);
    }

    const totalBytes = parseInt(resp.headers.get('content-length') || '0', 10);
    const reader = resp.body?.getReader();
    if (!reader) {
      const buf = await resp.arrayBuffer();
      fs.writeFileSync(msiPath, Buffer.from(buf));
      onProgress(100);
    } else {
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          if (totalBytes > 0) {
            const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            onProgress(pct);
          }
        }
      }

      const totalBuffer = Buffer.concat(chunks);
      fs.writeFileSync(msiPath, totalBuffer);
      onProgress(100);
    }

    await shell.openPath(msiPath);
    return msiPath;
  }

  public getRecommendedJava(mcVersion: string): JavaInstallation | undefined {
    const list = this.detectJavaInstallations();
    if (list.length === 0) return undefined;

    const targetMajor = this.getRequiredJavaVersion(mcVersion);

    // Try finding exact match or closest >=
    const exact = list.find((j) => j.majorVersion === targetMajor);
    if (exact) return exact;

    const higher = list.find((j) => j.majorVersion >= targetMajor);
    if (higher) return higher;

    return list[0];
  }
}

export const javaDetector = new JavaDetector();
