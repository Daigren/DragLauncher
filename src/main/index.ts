import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { configManager } from './config';
import { accountManager } from './accountManager';
import { instanceManager } from './instanceManager';
import { mojangService } from './mojang';
import { javaDetector } from './javaDetector';
import { fabricService } from './fabric';
import { modrinthService } from './modrinth';
import { minecraftLauncher } from './launcher';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 950,
    minHeight: 600,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Accounts
  ipcMain.handle('accounts:list', () => accountManager.getAccounts());
  ipcMain.handle('accounts:getActive', () => accountManager.getActiveAccount());
  ipcMain.handle('accounts:setActive', (_e, id) => accountManager.setActiveAccount(id));
  ipcMain.handle('accounts:addOffline', (_e, username) => accountManager.addOfflineAccount(username));
  ipcMain.handle('accounts:addTLauncher', (_e, u, p) => accountManager.addTLauncherAccount(u, p));
  ipcMain.handle('accounts:addElyBy', (_e, u, p) => accountManager.addElyByAccount(u, p));
  ipcMain.handle('accounts:remove', (_e, id) => accountManager.removeAccount(id));

  // Instances
  ipcMain.handle('instances:list', () => instanceManager.listInstances());
  ipcMain.handle('instances:create', (_e, options) => instanceManager.createInstance(options));
  ipcMain.handle('instances:update', (_e, id, partial) => instanceManager.updateInstance(id, partial));
  ipcMain.handle('instances:delete', (_e, id) => instanceManager.deleteInstance(id));
  ipcMain.handle('instances:openFolder', (_e, id) => instanceManager.openInstanceFolder(id));
  ipcMain.handle('instances:listMods', (_e, id) => instanceManager.listInstanceMods(id));
  ipcMain.handle('instances:toggleMod', (_e, id, file) => instanceManager.toggleMod(id, file));
  ipcMain.handle('instances:deleteMod', (_e, id, file) => instanceManager.deleteMod(id, file));

  // Content (Mods, Resource Packs, Shaders)
  ipcMain.handle('content:list', (_e, instanceId, type) =>
    instanceManager.listContent(instanceId, type)
  );
  ipcMain.handle('content:toggle', (_e, instanceId, type, file) =>
    instanceManager.toggleContent(instanceId, type, file)
  );
  ipcMain.handle('content:delete', (_e, instanceId, type, file) =>
    instanceManager.deleteContent(instanceId, type, file)
  );
  ipcMain.handle('content:openFolder', (_e, instanceId, type) => {
    let sub: 'mods' | 'resourcepacks' | 'shaderpacks' = 'mods';
    if (type === 'resourcepack') sub = 'resourcepacks';
    if (type === 'shader') sub = 'shaderpacks';
    instanceManager.openSubfolder(instanceId, sub);
  });
  ipcMain.handle('content:search', (_e, q, type, mc, l) =>
    modrinthService.searchContent(q, type, mc, l)
  );
  ipcMain.handle('content:install', (_e, instId, pId, type, mc, l) =>
    modrinthService.installContent(instId, pId, type, mc, l)
  );

  // Launcher
  ipcMain.handle('launcher:launch', async (_e, instanceId) => {
    const inst = instanceManager.getInstance(instanceId);
    if (!inst) throw new Error('Инстанс не найден');
    const acc = accountManager.getActiveAccount();
    if (!acc) throw new Error('Не выбран активный аккаунт! Добавьте или выберите аккаунт.');
    await minecraftLauncher.launch(inst, acc, mainWindow);
  });
  ipcMain.handle('launcher:kill', (_e, id) => minecraftLauncher.killInstance(id));

  // Meta & Java
  ipcMain.handle('meta:getMinecraftVersions', () => mojangService.getVersions());
  ipcMain.handle('meta:detectJava', () => javaDetector.detectJavaInstallations());
  ipcMain.handle('meta:getFabricLoaders', (_e, mcVer) => fabricService.getLoaderVersions(mcVer));

  // Settings
  ipcMain.handle('settings:get', () => configManager.getSettings());
  ipcMain.handle('settings:update', (_e, p) => configManager.updateSettings(p));
}
