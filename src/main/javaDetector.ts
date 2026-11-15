import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

  public getRecommendedJava(mcVersion: string): JavaInstallation | undefined {
    const list = this.detectJavaInstallations();
    if (list.length === 0) return undefined;

    // MC 1.20.5+ requires Java 21+
    // MC 1.17 - 1.20.4 requires Java 17
    // MC <= 1.16.5 requires Java 8
    const parts = mcVersion.split('.').map((p) => parseInt(p, 10));
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    let targetMajor = 8;
    if (minor > 20 || (minor === 20 && patch >= 5)) {
      targetMajor = 21;
    } else if (minor >= 17) {
      targetMajor = 17;
    }

    // Try finding exact match or closest >=
    const exact = list.find((j) => j.majorVersion === targetMajor);
    if (exact) return exact;

    const higher = list.find((j) => j.majorVersion >= targetMajor);
    if (higher) return higher;

    return list[0];
  }
}

export const javaDetector = new JavaDetector();
