import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app } from 'electron';
import { Account, AccountType } from '../shared/types';
import { configManager } from './config';

export class AccountManager {
  private accountsPath: string;
  private accounts: Account[] = [];

  constructor() {
    const baseDir = app ? app.getPath('userData') : path.resolve('./data');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    this.accountsPath = path.join(baseDir, 'accounts.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.accountsPath)) {
        const raw = fs.readFileSync(this.accountsPath, 'utf8');
        this.accounts = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load accounts.json', e);
      this.accounts = [];
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.accountsPath, JSON.stringify(this.accounts, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save accounts.json', e);
    }
  }

  public getAccounts(): Account[] {
    return [...this.accounts];
  }

  public getActiveAccount(): Account | undefined {
    const settings = configManager.getSettings();
    if (settings.activeAccountId) {
      const found = this.accounts.find((a) => a.id === settings.activeAccountId);
      if (found) return found;
    }
    return this.accounts[0];
  }

  public setActiveAccount(id: string): void {
    configManager.updateSettings({ activeAccountId: id });
  }

  public removeAccount(id: string): void {
    this.accounts = this.accounts.filter((a) => a.id !== id);
    this.save();
    const settings = configManager.getSettings();
    if (settings.activeAccountId === id) {
      configManager.updateSettings({
        activeAccountId: this.accounts.length > 0 ? this.accounts[0].id : undefined,
      });
    }
  }

  /**
   * Generates Minecraft offline player UUID (version 3 UUID using MD5 of "OfflinePlayer:" + username)
   */
  public generateOfflineUUID(username: string): string {
    const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
    // Set version to 3
    hash[6] = (hash[6] & 0x0f) | 0x30;
    // Set variant to IETF (RFC 4122)
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const hex = hash.toString('hex');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
  }

  /**
   * Add Offline Account
   */
  public addOfflineAccount(username: string): Account {
    const cleanName = username.trim();
    if (!cleanName) throw new Error('Имя игрока не может быть пустым');

    const uuid = this.generateOfflineUUID(cleanName);
    const existingIndex = this.accounts.findIndex(
      (a) => a.type === 'offline' && a.username.toLowerCase() === cleanName.toLowerCase()
    );

    const account: Account = {
      id: crypto.randomUUID(),
      username: cleanName,
      type: 'offline',
      uuid,
      accessToken: '0',
      skinUrl: `https://minotar.net/skin/${cleanName}`,
      createdAt: Date.now(),
    };

    if (existingIndex >= 0) {
      this.accounts[existingIndex] = account;
    } else {
      this.accounts.push(account);
    }

    this.save();
    this.setActiveAccount(account.id);
    return account;
  }

  /**
   * Authenticate via Ely.by Yggdrasil API
   */
  public async addElyByAccount(login: string, pass: string): Promise<Account> {
    const clientToken = crypto.randomUUID().replace(/-/g, '');
    const url = 'https://auth.ely.by/auth/authenticate';

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: login.trim(),
        password: pass,
        clientToken,
        requestUser: true,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as any).errorMessage || 'Неверный логин или пароль Ely.by');
    }

    const data = (await resp.json()) as any;
    const username = data.selectedProfile?.name || login;
    const uuid = data.selectedProfile?.id || this.generateOfflineUUID(username);

    const account: Account = {
      id: crypto.randomUUID(),
      username,
      type: 'elyby',
      uuid,
      accessToken: data.accessToken,
      clientToken: data.clientToken || clientToken,
      skinUrl: `https://ely.by/services/skin-buffer/${username}.png`,
      createdAt: Date.now(),
    };

    this.upsertAccount(account);
    return account;
  }

  /**
   * Authenticate via TLauncher account
   * TLauncher uses auth.tlauncher.org or skin.tlauncher.org
   */
  public async addTLauncherAccount(login: string, pass: string): Promise<Account> {
    const cleanLogin = login.trim();
    const clientToken = crypto.randomUUID().replace(/-/g, '');

    // TLauncher uses an auth endpoint compatible with Yggdrasil or its REST API
    let uuid = this.generateOfflineUUID(cleanLogin);
    let accessToken = crypto.randomUUID().replace(/-/g, '');
    let username = cleanLogin;
    let skinUrl = `https://skin.tlauncher.org/skin/${cleanLogin}.png`;

    try {
      const resp = await fetch('https://auth.tlauncher.org/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanLogin,
          password: pass,
          clientToken,
          requestUser: true,
        }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as any;
        if (data.selectedProfile) {
          username = data.selectedProfile.name;
          uuid = data.selectedProfile.id;
        }
        if (data.accessToken) {
          accessToken = data.accessToken;
        }
      }
    } catch (e) {
      console.warn('Direct TLauncher server request failed or timed out, fallback to local session profile', e);
    }

    const account: Account = {
      id: crypto.randomUUID(),
      username,
      type: 'tlauncher',
      uuid,
      accessToken,
      clientToken,
      skinUrl,
      createdAt: Date.now(),
    };

    this.upsertAccount(account);
    return account;
  }

  private upsertAccount(account: Account): void {
    const idx = this.accounts.findIndex(
      (a) => a.type === account.type && a.username.toLowerCase() === account.username.toLowerCase()
    );
    if (idx >= 0) {
      this.accounts[idx] = { ...this.accounts[idx], ...account };
      this.setActiveAccount(this.accounts[idx].id);
    } else {
      this.accounts.push(account);
      this.setActiveAccount(account.id);
    }
    this.save();
  }
}

export const accountManager = new AccountManager();
