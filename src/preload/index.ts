import { contextBridge, ipcRenderer } from 'electron';
import {
  Account,
  Instance,
  ContentItem,
  ContentType,
  AppSettings,
  MinecraftVersionMeta,
  LaunchProgress,
} from '../shared/types';

export const api = {
  accounts: {
    list: (): Promise<Account[]> => ipcRenderer.invoke('accounts:list'),
    getActive: (): Promise<Account | undefined> => ipcRenderer.invoke('accounts:getActive'),
    setActive: (id: string): Promise<void> => ipcRenderer.invoke('accounts:setActive', id),
    addOffline: (username: string): Promise<Account> => ipcRenderer.invoke('accounts:addOffline', username),
    addTLauncher: (username: string, pass: string): Promise<Account> =>
      ipcRenderer.invoke('accounts:addTLauncher', username, pass),
    addElyBy: (username: string, pass: string): Promise<Account> =>
      ipcRenderer.invoke('accounts:addElyBy', username, pass),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('accounts:remove', id),
  },
  instances: {
    list: (): Promise<Instance[]> => ipcRenderer.invoke('instances:list'),
    create: (options: any): Promise<Instance> => ipcRenderer.invoke('instances:create', options),
    update: (id: string, partial: Partial<Instance>): Promise<Instance> =>
      ipcRenderer.invoke('instances:update', id, partial),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('instances:delete', id),
    openFolder: (id: string): Promise<void> => ipcRenderer.invoke('instances:openFolder', id),
    listMods: (id: string): Promise<ContentItem[]> => ipcRenderer.invoke('instances:listMods', id),
    toggleMod: (instanceId: string, fileName: string): Promise<void> =>
      ipcRenderer.invoke('instances:toggleMod', instanceId, fileName),
    deleteMod: (instanceId: string, fileName: string): Promise<void> =>
      ipcRenderer.invoke('instances:deleteMod', instanceId, fileName),
  },
  content: {
    list: (instanceId: string, type: ContentType): Promise<ContentItem[]> =>
      ipcRenderer.invoke('content:list', instanceId, type),
    toggle: (instanceId: string, type: ContentType, fileName: string): Promise<void> =>
      ipcRenderer.invoke('content:toggle', instanceId, type, fileName),
    delete: (instanceId: string, type: ContentType, fileName: string): Promise<void> =>
      ipcRenderer.invoke('content:delete', instanceId, type, fileName),
    openFolder: (instanceId: string, type: ContentType): Promise<void> =>
      ipcRenderer.invoke('content:openFolder', instanceId, type),
    search: (
      query: string,
      type: ContentType,
      mcVersion?: string,
      loader?: string
    ): Promise<any[]> => ipcRenderer.invoke('content:search', query, type, mcVersion, loader),
    install: (
      instanceId: string,
      projectId: string,
      type: ContentType,
      mcVersion?: string,
      loader?: string
    ): Promise<boolean> =>
      ipcRenderer.invoke('content:install', instanceId, projectId, type, mcVersion, loader),
  },
  launcher: {
    launch: (instanceId: string): Promise<void> => ipcRenderer.invoke('launcher:launch', instanceId),
    kill: (instanceId: string): Promise<void> => ipcRenderer.invoke('launcher:kill', instanceId),
    onProgress: (callback: (progress: LaunchProgress) => void) => {
      const listener = (_event: any, data: LaunchProgress) => callback(data);
      ipcRenderer.on('launch-progress', listener);
      return () => ipcRenderer.removeListener('launch-progress', listener);
    },
    onLog: (callback: (log: { instanceId: string; line: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on('launch-log', listener);
      return () => ipcRenderer.removeListener('launch-log', listener);
    },
  },
  meta: {
    getMinecraftVersions: (): Promise<MinecraftVersionMeta[]> =>
      ipcRenderer.invoke('meta:getMinecraftVersions'),
    detectJava: (): Promise<any[]> => ipcRenderer.invoke('meta:detectJava'),
    getFabricLoaders: (mcVersion: string): Promise<any[]> =>
      ipcRenderer.invoke('meta:getFabricLoaders', mcVersion),
  },
  mods: {
    search: (query: string, mcVersion?: string, loader?: string): Promise<any[]> =>
      ipcRenderer.invoke('content:search', query, 'mod', mcVersion, loader),
    install: (
      instanceId: string,
      projectId: string,
      mcVersion: string,
      loader?: string
    ): Promise<boolean> =>
      ipcRenderer.invoke('content:install', instanceId, projectId, 'mod', mcVersion, loader),
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (partial: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', partial),
    selectFolder: (): Promise<string | null> => ipcRenderer.invoke('settings:selectFolder'),
  },
  app: {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
