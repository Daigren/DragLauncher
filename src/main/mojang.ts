import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { VersionManifestResponse, MinecraftVersionMeta } from '../shared/types';

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

export class MojangService {
  private cachePath: string;

  constructor() {
    const baseDir = app ? app.getPath('userData') : path.resolve('./data');
    const cacheDir = path.join(baseDir, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    this.cachePath = path.join(cacheDir, 'version_manifest.json');
  }

  public async getVersions(): Promise<MinecraftVersionMeta[]> {
    try {
      const resp = await fetch(MANIFEST_URL, { signal: AbortSignal.timeout(10000) });
      if (resp.ok) {
        const data = (await resp.json()) as VersionManifestResponse;
        fs.writeFileSync(this.cachePath, JSON.stringify(data), 'utf8');
        return data.versions;
      }
    } catch (e) {
      console.warn('Failed to fetch Mojang manifest, trying cache', e);
    }

    if (fs.existsSync(this.cachePath)) {
      try {
        const raw = fs.readFileSync(this.cachePath, 'utf8');
        const data = JSON.parse(raw) as VersionManifestResponse;
        return data.versions;
      } catch (err) {
        console.error('Failed to read cached version manifest', err);
      }
    }

    return [];
  }

  public async getVersionPackage(url: string, savePath: string): Promise<any> {
    if (fs.existsSync(savePath)) {
      try {
        return JSON.parse(fs.readFileSync(savePath, 'utf8'));
      } catch (e) {
        // re-download if corrupt
      }
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Не удалось загрузить манифест версии: ${resp.statusText}`);
    const data = await resp.json();
    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
}

export const mojangService = new MojangService();
