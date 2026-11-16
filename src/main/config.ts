import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AppSettings } from '../shared/types';

export class ConfigManager {
  private configPath: string;
  private settings: AppSettings;

  constructor() {
    const baseDir = app ? app.getPath('userData') : path.resolve('./data');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    this.configPath = path.join(baseDir, 'draglauncher.config.json');
    this.settings = this.load();
  }

  public getDefaultDataDir(): string {
    return app ? app.getPath('userData') : path.resolve('./data');
  }

  public getGameDataDir(): string {
    return this.settings.gameDataDir || this.getDefaultDataDir();
  }

  public getInstancesDir(): string {
    return this.settings.instancesDir || path.join(this.getGameDataDir(), 'instances');
  }

  public getCommonDir(): string {
    const common = path.join(this.getGameDataDir(), 'common');
    if (!fs.existsSync(common)) {
      fs.mkdirSync(common, { recursive: true });
    }
    return common;
  }

  private getDefaultInstancesDir(): string {
    return path.join(this.getDefaultDataDir(), 'instances');
  }

  private load(): AppSettings {
    const defaultData = this.getDefaultDataDir();
    const defaults: AppSettings = {
      gameDataDir: defaultData,
      instancesDir: path.join(defaultData, 'instances'),
      defaultJavaPath: 'java',
      defaultMinMemory: 1024,
      defaultMaxMemory: 4096,
      defaultJvmArgs: '-XX:+UseG1GC -Dsun.rmi.dgc.server.gcInterval=2147483646 -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M',
      closeOnLaunch: false,
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.error('Failed to read config file, using defaults', e);
    }

    this.save(defaults);
    return defaults;
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    if (partial.gameDataDir && !partial.instancesDir) {
      partial.instancesDir = path.join(partial.gameDataDir, 'instances');
    }
    this.settings = { ...this.settings, ...partial };
    this.save(this.settings);
    return this.getSettings();
  }

  private save(settings: AppSettings): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(settings, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save config file', e);
    }
  }
}

export const configManager = new ConfigManager();
