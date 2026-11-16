import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { shell } from 'electron';
import { Instance, ContentItem, ContentType, ModLoaderType } from '../shared/types';
import { configManager } from './config';

export class InstanceManager {
  private getInstancesDir(): string {
    const dir = configManager.getInstancesDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public listInstances(): Instance[] {
    const baseDir = this.getInstancesDir();
    const result: Instance[] = [];

    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(baseDir, entry.name, 'instance.json');
          if (fs.existsSync(configPath)) {
            try {
              const content = fs.readFileSync(configPath, 'utf8');
              const inst = JSON.parse(content) as Instance;
              inst.path = path.join(baseDir, entry.name);
              result.push(inst);
            } catch (err) {
              console.error(`Failed to parse instance config at ${configPath}`, err);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to list instances', e);
    }

    return result.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  }

  public getInstance(id: string): Instance | undefined {
    return this.listInstances().find((i) => i.id === id);
  }

  public createInstance(options: {
    name: string;
    minecraftVersion: string;
    loaderType?: ModLoaderType;
    loaderVersion?: string;
    icon?: string;
    maxMemory?: number;
  }): Instance {
    const baseDir = this.getInstancesDir();
    const id = `${options.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${crypto.randomBytes(3).toString('hex')}`;
    const instanceFolder = path.join(baseDir, id);
    const mcDir = path.join(instanceFolder, '.minecraft');

    // Create directories
    fs.mkdirSync(instanceFolder, { recursive: true });
    fs.mkdirSync(path.join(mcDir, 'mods'), { recursive: true });
    fs.mkdirSync(path.join(mcDir, 'saves'), { recursive: true });
    fs.mkdirSync(path.join(mcDir, 'resourcepacks'), { recursive: true });
    fs.mkdirSync(path.join(mcDir, 'shaderpacks'), { recursive: true });
    fs.mkdirSync(path.join(mcDir, 'config'), { recursive: true });

    const newInst: Instance = {
      id,
      name: options.name.trim() || `Minecraft ${options.minecraftVersion}`,
      minecraftVersion: options.minecraftVersion,
      loaderType: options.loaderType || 'vanilla',
      loaderVersion: options.loaderVersion,
      icon: options.icon || 'grass',
      maxMemory: options.maxMemory || 4096,
      createdAt: Date.now(),
      lastPlayed: 0,
      totalPlayTime: 0,
      path: instanceFolder,
    };

    const configPath = path.join(instanceFolder, 'instance.json');
    fs.writeFileSync(configPath, JSON.stringify(newInst, null, 2), 'utf8');

    return newInst;
  }

  public updateInstance(id: string, partial: Partial<Instance>): Instance {
    const inst = this.getInstance(id);
    if (!inst) throw new Error(`Инстанс с id ${id} не найден`);

    const updated: Instance = { ...inst, ...partial };
    const configPath = path.join(inst.path, 'instance.json');
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');

    return updated;
  }

  public deleteInstance(id: string): void {
    const inst = this.getInstance(id);
    if (!inst) return;
    try {
      fs.rmSync(inst.path, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to delete instance ${id}`, e);
    }
  }

  public openInstanceFolder(id: string): void {
    const inst = this.getInstance(id);
    if (!inst) return;
    shell.openPath(inst.path);
  }

  public openSubfolder(id: string, subfolder: 'mods' | 'resourcepacks' | 'shaderpacks'): void {
    const inst = this.getInstance(id);
    if (!inst) return;
    const target = path.join(inst.path, '.minecraft', subfolder);
    fs.mkdirSync(target, { recursive: true });
    shell.openPath(target);
  }

  public listContent(id: string, type: ContentType): ContentItem[] {
    const inst = this.getInstance(id);
    if (!inst) return [];

    let subfolder = 'mods';
    if (type === 'resourcepack') subfolder = 'resourcepacks';
    if (type === 'shader') subfolder = 'shaderpacks';

    const dir = path.join(inst.path, '.minecraft', subfolder);
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir);
    const items: ContentItem[] = [];

    for (const file of files) {
      const isZip = file.endsWith('.zip') || file.endsWith('.zip.disabled');
      const isJar = file.endsWith('.jar') || file.endsWith('.jar.disabled');

      if (isZip || isJar) {
        const enabled = !file.endsWith('.disabled');
        const cleanName = file
          .replace('.disabled', '')
          .replace('.jar', '')
          .replace('.zip', '');

        items.push({
          id: file,
          fileName: file,
          name: cleanName,
          type,
          enabled,
          source: 'local',
        });
      }
    }

    return items;
  }

  public toggleContent(instanceId: string, type: ContentType, fileName: string): void {
    const inst = this.getInstance(instanceId);
    if (!inst) return;

    let subfolder = 'mods';
    if (type === 'resourcepack') subfolder = 'resourcepacks';
    if (type === 'shader') subfolder = 'shaderpacks';

    const dir = path.join(inst.path, '.minecraft', subfolder);
    const oldPath = path.join(dir, fileName);
    if (!fs.existsSync(oldPath)) return;

    let newPath: string;
    if (fileName.endsWith('.disabled')) {
      newPath = path.join(dir, fileName.replace('.disabled', ''));
    } else {
      newPath = path.join(dir, `${fileName}.disabled`);
    }

    fs.renameSync(oldPath, newPath);
  }

  public deleteContent(instanceId: string, type: ContentType, fileName: string): void {
    const inst = this.getInstance(instanceId);
    if (!inst) return;

    let subfolder = 'mods';
    if (type === 'resourcepack') subfolder = 'resourcepacks';
    if (type === 'shader') subfolder = 'shaderpacks';

    const filePath = path.join(inst.path, '.minecraft', subfolder, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Backward compatibility methods for mods
  public listInstanceMods(id: string): ContentItem[] {
    return this.listContent(id, 'mod');
  }

  public toggleMod(id: string, file: string): void {
    this.toggleContent(id, 'mod', file);
  }

  public deleteMod(id: string, file: string): void {
    this.deleteContent(id, 'mod', file);
  }
}

export const instanceManager = new InstanceManager();
