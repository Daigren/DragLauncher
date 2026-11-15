export type AccountType = 'tlauncher' | 'elyby' | 'offline' | 'microsoft';

export interface Account {
  id: string;
  username: string;
  type: AccountType;
  uuid: string;
  accessToken: string;
  clientToken?: string;
  skinUrl?: string;
  capeUrl?: string;
  createdAt: number;
}

export type ModLoaderType = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';

export interface Instance {
  id: string;
  name: string;
  minecraftVersion: string;
  loaderType: ModLoaderType;
  loaderVersion?: string;
  icon?: string;
  javaPath?: string;
  minMemory?: number; // In MB
  maxMemory?: number; // In MB
  jvmArgs?: string;
  windowWidth?: number;
  windowHeight?: number;
  lastPlayed?: number;
  totalPlayTime?: number; // In seconds
  createdAt: number;
  path: string;
}

export interface MinecraftVersionMeta {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  url: string;
  time: string;
  releaseTime: string;
}

export interface VersionManifestResponse {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftVersionMeta[];
}

export type LaunchState = 'idle' | 'preparing' | 'downloading' | 'verifying' | 'launching' | 'running' | 'error' | 'stopped';

export interface LaunchProgress {
  instanceId: string;
  state: LaunchState;
  step: string;
  current: number;
  total: number;
  speed?: string;
  log?: string;
}

export interface AppSettings {
  instancesDir: string;
  defaultJavaPath: string;
  defaultMinMemory: number;
  defaultMaxMemory: number;
  defaultJvmArgs: string;
  closeOnLaunch: boolean;
  activeAccountId?: string;
}

export type ContentType = 'mod' | 'resourcepack' | 'shader';

export interface ContentItem {
  id: string;
  fileName: string;
  name: string;
  type: ContentType;
  enabled: boolean;
  description?: string;
  source?: 'modrinth' | 'curseforge' | 'local';
}

// Keep backward-compatible alias
export type ModItem = ContentItem;
