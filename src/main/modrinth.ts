import fs from 'fs';
import path from 'path';
import { ContentType } from '../shared/types';
import { instanceManager } from './instanceManager';

export interface ModrinthSearchResult {
  project_id: string;
  title: string;
  description: string;
  icon_url: string;
  author: string;
  downloads: number;
  follows: number;
  versions: string[];
}

export class ModrinthService {
  private baseUrl = 'https://api.modrinth.com/v2';

  public async searchContent(
    query: string,
    type: ContentType = 'mod',
    mcVersion?: string,
    loader?: string
  ): Promise<ModrinthSearchResult[]> {
    // Map ContentType to Modrinth project_type facet
    let modrinthProjectType = 'mod';
    if (type === 'resourcepack') {
      modrinthProjectType = 'resourcepack';
    } else if (type === 'shader') {
      modrinthProjectType = 'shader';
    }

    const facets: string[][] = [[`project_type:${modrinthProjectType}`]];

    if (mcVersion) {
      facets.push([`versions:${mcVersion}`]);
    }

    // Only mods strictly filter by loader categories (fabric, forge, etc.)
    if (type === 'mod' && loader && loader !== 'vanilla') {
      facets.push([`categories:${loader}`]);
    }

    const params = new URLSearchParams({
      query: query || '',
      limit: '25',
      facets: JSON.stringify(facets),
    });

    try {
      const resp = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
        headers: { 'User-Agent': 'DragLauncher/1.0.0 (contact@draglauncher.org)' },
      });
      if (!resp.ok) return [];
      const data = (await resp.json()) as any;
      return (data.hits || []).map((hit: any) => ({
        project_id: hit.project_id,
        title: hit.title,
        description: hit.description,
        icon_url: hit.icon_url,
        author: hit.author,
        downloads: hit.downloads,
        follows: hit.follows,
        versions: hit.versions,
      }));
    } catch (e) {
      console.error('Modrinth search failed', e);
      return [];
    }
  }

  public async installContent(
    instanceId: string,
    projectId: string,
    type: ContentType = 'mod',
    mcVersion?: string,
    loader?: string
  ): Promise<boolean> {
    const inst = instanceManager.getInstance(instanceId);
    if (!inst) throw new Error('Инстанс не найден');

    const versionsUrl = `${this.baseUrl}/project/${projectId}/version`;
    const resp = await fetch(versionsUrl, {
      headers: { 'User-Agent': 'DragLauncher/1.0.0' },
    });
    if (!resp.ok) throw new Error('Не удалось получить версии проекта');

    const versions = (await resp.json()) as any[];

    // Find compatible version
    const compatible = versions.find((v) => {
      const verMatch = !mcVersion || v.game_versions.includes(mcVersion);
      if (type === 'mod') {
        const loaderMatch = !loader || loader === 'vanilla' || v.loaders.includes(loader);
        return verMatch && loaderMatch;
      }
      return verMatch;
    }) || versions[0];

    if (!compatible || !compatible.files || compatible.files.length === 0) {
      throw new Error('Не найдено подходящей версии для выбранной версии Minecraft');
    }

    const primaryFile = compatible.files.find((f: any) => f.primary) || compatible.files[0];

    // Determine target subfolder based on content type
    let subfolder = 'mods';
    if (type === 'resourcepack') {
      subfolder = 'resourcepacks';
    } else if (type === 'shader') {
      subfolder = 'shaderpacks';
    }

    const targetDir = path.join(inst.path, '.minecraft', subfolder);
    fs.mkdirSync(targetDir, { recursive: true });

    const destPath = path.join(targetDir, primaryFile.filename);
    const fileResp = await fetch(primaryFile.url);
    if (!fileResp.ok) throw new Error('Ошибка загрузки файла');

    const buffer = await fileResp.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    return true;
  }
}

export const modrinthService = new ModrinthService();
