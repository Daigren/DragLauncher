import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { app, BrowserWindow } from 'electron';
import { Instance, Account, LaunchProgress } from '../shared/types';
import { mojangService } from './mojang';
import { configManager } from './config';
import { javaDetector } from './javaDetector';
import { skinAgentManager } from './skinAgent';

export class MinecraftLauncher {
  private activeProcesses: Map<string, ChildProcess> = new Map();

  private getCommonDir(): string {
    return configManager.getCommonDir();
  }

  private sendProgress(win: BrowserWindow | null, progress: LaunchProgress): void {
    if (win && !win.isDestroyed()) {
      win.webContents.send('launch-progress', progress);
    }
  }

  private sendLog(win: BrowserWindow | null, instanceId: string, line: string): void {
    if (win && !win.isDestroyed()) {
      win.webContents.send('launch-log', { instanceId, line });
    }
  }

  public async launch(instance: Instance, account: Account, win: BrowserWindow | null): Promise<void> {
    if (this.activeProcesses.has(instance.id)) {
      throw new Error('Данный инстанс уже запущен!');
    }

    const commonDir = this.getCommonDir();
    const versionsDir = path.join(commonDir, 'versions');
    const librariesDir = path.join(commonDir, 'libraries');
    const assetsDir = path.join(commonDir, 'assets');
    const nativesDir = path.join(instance.path, 'natives');

    fs.mkdirSync(versionsDir, { recursive: true });
    fs.mkdirSync(librariesDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(path.join(nativesDir, 'jna'), { recursive: true });
    fs.mkdirSync(path.join(nativesDir, 'lwjgl'), { recursive: true });
    fs.mkdirSync(path.join(nativesDir, 'netty'), { recursive: true });

    this.sendProgress(win, {
      instanceId: instance.id,
      state: 'preparing',
      step: 'Подготовка к запуску...',
      current: 5,
      total: 100,
    });

    // 1. Get version manifest
    const versions = await mojangService.getVersions();
    const versionMeta = versions.find((v) => v.id === instance.minecraftVersion);
    if (!versionMeta) {
      throw new Error(`Версия Minecraft ${instance.minecraftVersion} не найдена в манифесте Mojang`);
    }

    const versionJsonPath = path.join(versionsDir, instance.minecraftVersion, `${instance.minecraftVersion}.json`);
    const versionData = await mojangService.getVersionPackage(versionMeta.url, versionJsonPath);

    // 2. Download client JAR
    const clientJarPath = path.join(versionsDir, instance.minecraftVersion, `${instance.minecraftVersion}.jar`);
    if (!fs.existsSync(clientJarPath)) {
      this.sendProgress(win, {
        instanceId: instance.id,
        state: 'downloading',
        step: `Загрузка клиента Minecraft ${instance.minecraftVersion}...`,
        current: 15,
        total: 100,
      });

      const clientDownload = versionData.downloads?.client;
      if (clientDownload?.url) {
        const resp = await fetch(clientDownload.url);
        if (!resp.ok) throw new Error('Не удалось скачать minecraft.jar');
        const buffer = await resp.arrayBuffer();
        fs.mkdirSync(path.dirname(clientJarPath), { recursive: true });
        fs.writeFileSync(clientJarPath, Buffer.from(buffer));
      }
    }

    // 3. Download libraries & collect classpath
    const classpath: string[] = [];
    const rawLibraries = versionData.libraries || [];

    this.sendProgress(win, {
      instanceId: instance.id,
      state: 'downloading',
      step: 'Загрузка библиотек...',
      current: 30,
      total: 100,
    });

    for (let i = 0; i < rawLibraries.length; i++) {
      const lib = rawLibraries[i];
      if (!this.isLibraryAllowed(lib)) continue;

      const artifact = lib.downloads?.artifact;
      if (artifact?.url && artifact?.path) {
        const libDest = path.join(librariesDir, artifact.path);
        if (!fs.existsSync(libDest)) {
          try {
            const resp = await fetch(artifact.url);
            if (resp.ok) {
              const buf = await resp.arrayBuffer();
              fs.mkdirSync(path.dirname(libDest), { recursive: true });
              fs.writeFileSync(libDest, Buffer.from(buf));
            }
          } catch (e) {
            console.warn(`Failed to download library ${artifact.path}`, e);
          }
        }
        if (fs.existsSync(libDest)) {
          classpath.push(libDest);
        }
      }
    }

    // Add client JAR to classpath
    classpath.push(clientJarPath);

    // 4. Download Asset Index & Asset Objects
    this.sendProgress(win, {
      instanceId: instance.id,
      state: 'downloading',
      step: 'Проверка ресурсов (звуки, текстуры, интерфейс)...',
      current: 50,
      total: 100,
    });

    const assetIndexInfo = versionData.assetIndex;
    if (assetIndexInfo) {
      const indexFilePath = path.join(assetsDir, 'indexes', `${assetIndexInfo.id}.json`);
      if (!fs.existsSync(indexFilePath)) {
        try {
          const resp = await fetch(assetIndexInfo.url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            fs.mkdirSync(path.dirname(indexFilePath), { recursive: true });
            fs.writeFileSync(indexFilePath, Buffer.from(buf));
          }
        } catch (e) {
          console.warn('Failed to download asset index', e);
        }
      }

      // Download missing asset objects in parallel
      if (fs.existsSync(indexFilePath)) {
        try {
          const indexJson = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));
          const objects = indexJson.objects || {};
          await this.downloadAssetObjects(objects, assetsDir, (done, total) => {
            const pct = 50 + Math.round((done / total) * 35);
            this.sendProgress(win, {
              instanceId: instance.id,
              state: 'downloading',
              step: `Загрузка ресурсов: ${done}/${total}...`,
              current: pct,
              total: 100,
            });
          });
        } catch (err) {
          console.warn('Asset objects download error', err);
        }
      }
    }

    // 5. Ensure skin agent
    await skinAgentManager.ensureAgent();

    // 6. Resolve Java Path
    let rawJavaPath = instance.javaPath || configManager.getSettings().defaultJavaPath;
    if (!rawJavaPath || rawJavaPath === 'java') {
      const rec = javaDetector.getRecommendedJava(instance.minecraftVersion);
      if (rec) {
        rawJavaPath = rec.path;
      } else {
        rawJavaPath = 'java';
      }
    }

    // Strip any accidental wrapping quotes
    const javaExecutable = rawJavaPath.replace(/^["']|["']$/g, '');

    // 7. Assemble JVM & Game arguments
    const minMem = instance.minMemory || configManager.getSettings().defaultMinMemory || 1024;
    const maxMem = instance.maxMemory || configManager.getSettings().defaultMaxMemory || 4096;
    const mcDir = path.join(instance.path, '.minecraft');

    const replacements: Record<string, string> = {
      '${auth_player_name}': account.username,
      '${version_name}': instance.name,
      '${game_directory}': mcDir,
      '${assets_root}': assetsDir,
      '${assets_index_name}': versionData.assets || versionData.assetIndex?.id || 'legacy',
      '${auth_uuid}': account.uuid.replace(/-/g, ''),
      '${auth_access_token}': account.accessToken || '0',
      '${clientid}': '0',
      '${auth_xuid}': '0',
      '${user_type}': account.type === 'microsoft' ? 'msa' : 'mojang',
      '${version_type}': 'release',
      '${user_properties}': '{}',
      '${launcher_name}': 'DragLauncher',
      '${launcher_version}': '1.0.0',
      '${natives_directory}': nativesDir,
      '${classpath}': classpath.join(';'),
    };

    const jvmArgs: string[] = [
      `-Xms${minMem}M`,
      `-Xmx${maxMem}M`,
      '-Xss1M',
      '-XX:StackShadowPages=32',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+UseG1GC',
      '--enable-native-access=ALL-UNNAMED',
      '--add-exports=java.base/jdk.internal.misc=ALL-UNNAMED',
      `-Djava.library.path=${nativesDir}`,
      `-Djna.tmpdir=${path.join(nativesDir, 'jna')}`,
      `-Dorg.lwjgl.system.SharedLibraryExtractPath=${path.join(nativesDir, 'lwjgl')}`,
      `-Dio.netty.native.workdir=${path.join(nativesDir, 'netty')}`,
      `-Dminecraft.launcher.brand=DragLauncher`,
      `-Dminecraft.launcher.version=1.0.0`,
      '-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump',
    ];

    // Add extra user-configured JVM args
    const extraJvm = (instance.jvmArgs || configManager.getSettings().defaultJvmArgs || '').trim();
    if (extraJvm) {
      jvmArgs.push(...extraJvm.split(/\s+/).filter(Boolean));
    }

    // TLauncher / Ely.by Skin Agent injection
    const agentArg = skinAgentManager.getJvmAgentArg(account);
    if (agentArg) {
      jvmArgs.push(agentArg);
      this.sendLog(win, instance.id, `[DragLauncher] Внедрён скин-агент: ${agentArg}`);
    }

    // Add classpath & mainClass
    jvmArgs.push('-cp', classpath.join(';'));
    jvmArgs.push(versionData.mainClass || 'net.minecraft.client.main.Main');

    // Assemble Game arguments
    const gameArgs: string[] = [];

    if (versionData.arguments && versionData.arguments.game) {
      for (const arg of versionData.arguments.game) {
        if (typeof arg === 'string') {
          let val = arg;
          for (const [k, v] of Object.entries(replacements)) {
            val = val.replaceAll(k, v);
          }
          gameArgs.push(val);
        }
      }
    } else if (versionData.minecraftArguments) {
      let legacy = versionData.minecraftArguments as string;
      for (const [k, v] of Object.entries(replacements)) {
        legacy = legacy.replaceAll(k, v);
      }
      gameArgs.push(...legacy.split(/\s+/).filter(Boolean));
    }

    const fullArgs = [...jvmArgs, ...gameArgs];

    this.sendProgress(win, {
      instanceId: instance.id,
      state: 'launching',
      step: 'Запуск процесса Java...',
      current: 95,
      total: 100,
    });

    this.sendLog(win, instance.id, `[DragLauncher] Запуск Minecraft ${instance.minecraftVersion}`);
    this.sendLog(win, instance.id, `[DragLauncher] Аккаунт: ${account.username} (${account.type}) [UUID: ${account.uuid}]`);
    this.sendLog(win, instance.id, `[DragLauncher] Java: ${javaExecutable}`);

    const startTime = Date.now();
    // Use shell: false to avoid Windows cmd.exe 8191-character command line limit
    const proc = spawn(javaExecutable, fullArgs, {
      cwd: mcDir,
      shell: false,
      windowsHide: false,
    });

    this.activeProcesses.set(instance.id, proc);

    this.sendProgress(win, {
      instanceId: instance.id,
      state: 'running',
      step: 'Игра запущена',
      current: 100,
      total: 100,
    });

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      this.sendLog(win, instance.id, text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      this.sendLog(win, instance.id, text);
    });

    proc.on('close', (code) => {
      const elapsedSec = Math.round((Date.now() - startTime) / 1000);
      this.activeProcesses.delete(instance.id);

      this.sendLog(win, instance.id, `[DragLauncher] Игра закрыта с кодом ${code}. Время сессии: ${elapsedSec} сек.`);
      this.sendProgress(win, {
        instanceId: instance.id,
        state: 'stopped',
        step: 'Остановлено',
        current: 0,
        total: 100,
      });

      // Update total play time
      const current = instance.totalPlayTime || 0;
      instance.lastPlayed = Date.now();
      instance.totalPlayTime = current + elapsedSec;
      const configPath = path.join(instance.path, 'instance.json');
      if (fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify(instance, null, 2), 'utf8');
      }
    });

    proc.on('error', (err) => {
      this.activeProcesses.delete(instance.id);
      this.sendLog(win, instance.id, `[CRASH] Ошибка процесса: ${err.message}`);
      this.sendProgress(win, {
        instanceId: instance.id,
        state: 'error',
        step: `Ошибка запуска: ${err.message}`,
        current: 0,
        total: 100,
      });
    });
  }

  public killInstance(instanceId: string): void {
    const proc = this.activeProcesses.get(instanceId);
    if (proc) {
      proc.kill();
      this.activeProcesses.delete(instanceId);
    }
  }

  /**
   * Fast concurrent downloader for Mojang asset objects
   */
  private async downloadAssetObjects(
    objects: Record<string, { hash: string; size: number }>,
    assetsDir: string,
    onProgress: (done: number, total: number) => void
  ): Promise<void> {
    const entries = Object.entries(objects);
    const missing: { hash: string; destPath: string }[] = [];

    for (const [_name, item] of entries) {
      const hash = item.hash;
      const sub = hash.substring(0, 2);
      const dest = path.join(assetsDir, 'objects', sub, hash);
      if (!fs.existsSync(dest)) {
        missing.push({ hash, destPath: dest });
      }
    }

    if (missing.length === 0) {
      onProgress(entries.length, entries.length);
      return;
    }

    let completed = entries.length - missing.length;
    const total = entries.length;
    onProgress(completed, total);

    // Concurrency pool: 30 parallel downloads
    const concurrency = 30;
    let index = 0;

    const worker = async () => {
      while (index < missing.length) {
        const current = missing[index++];
        const sub = current.hash.substring(0, 2);
        const url = `https://resources.download.minecraft.net/${sub}/${current.hash}`;

        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            fs.mkdirSync(path.dirname(current.destPath), { recursive: true });
            fs.writeFileSync(current.destPath, Buffer.from(buf));
          }
        } catch (e) {
          // ignore individual asset download failure
        }

        completed++;
        if (completed % 25 === 0 || completed === total) {
          onProgress(completed, total);
        }
      }
    };

    const pool = Array.from({ length: concurrency }, () => worker());
    await Promise.all(pool);
  }

  private isLibraryAllowed(lib: any): boolean {
    return this.isRuleAllowed(lib.rules);
  }

  private isRuleAllowed(rules?: any[]): boolean {
    if (!rules || rules.length === 0) return true;
    let allowed = false;
    for (const rule of rules) {
      if (rule.action === 'allow') {
        if (!rule.os || rule.os.name === 'windows') {
          allowed = true;
        }
      } else if (rule.action === 'disallow') {
        if (!rule.os || rule.os.name === 'windows') {
          allowed = false;
        }
      }
    }
    return allowed;
  }
}

export const minecraftLauncher = new MinecraftLauncher();
