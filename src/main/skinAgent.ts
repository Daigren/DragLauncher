import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Account } from '../shared/types';

const AUTHLIB_INJECTOR_URL = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.5/authlib-injector-1.2.5.jar';

export class SkinAgentManager {
  private agentPath: string;

  constructor() {
    const baseDir = app ? app.getPath('userData') : path.resolve('./data');
    const agentDir = path.join(baseDir, 'agents');
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }
    this.agentPath = path.join(agentDir, 'authlib-injector.jar');
  }

  public async ensureAgent(): Promise<string> {
    if (fs.existsSync(this.agentPath) && fs.statSync(this.agentPath).size > 10000) {
      return this.agentPath;
    }

    try {
      console.log('Downloading authlib-injector skin agent...');
      const resp = await fetch(AUTHLIB_INJECTOR_URL);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        fs.writeFileSync(this.agentPath, Buffer.from(buffer));
        console.log('authlib-injector downloaded successfully');
        return this.agentPath;
      }
    } catch (e) {
      console.warn('Failed to download authlib-injector, skin injection might be disabled', e);
    }

    return this.agentPath;
  }

  public getJvmAgentArg(account: Account): string | null {
    if (!fs.existsSync(this.agentPath)) return null;

    if (account.type === 'elyby') {
      return `-javaagent:${this.agentPath}=https://auth.ely.by/`;
    }

    if (account.type === 'tlauncher') {
      // TLauncher server or skin bridge
      return `-javaagent:${this.agentPath}=https://auth.tlauncher.org/`;
    }

    return null;
  }
}

export const skinAgentManager = new SkinAgentManager();
