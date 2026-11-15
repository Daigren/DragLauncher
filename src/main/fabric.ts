export interface FabricLoaderVersion {
  version: string;
  stable: boolean;
}

export class FabricService {
  private metaUrl = 'https://meta.fabricmc.net/v2';

  public async getLoaderVersions(gameVersion: string): Promise<FabricLoaderVersion[]> {
    try {
      const resp = await fetch(`${this.metaUrl}/versions/loader/${gameVersion}`);
      if (resp.ok) {
        const data = (await resp.json()) as any[];
        return data.map((item) => ({
          version: item.loader.version,
          stable: item.loader.stable,
        }));
      }
    } catch (e) {
      console.error('Failed to fetch Fabric loader versions', e);
    }
    return [{ version: '0.15.11', stable: true }, { version: '0.15.10', stable: true }];
  }
}

export const fabricService = new FabricService();
