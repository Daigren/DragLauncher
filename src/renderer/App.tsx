import React, { useState, useEffect } from 'react';
import {
  Plus,
  Play,
  Package,
  FolderOpen,
  Terminal,
  Settings as SettingsIcon,
  Search,
  Box,
  SlidersHorizontal,
  AlertCircle,
  GitBranch,
  ExternalLink,
} from 'lucide-react';
import { Account, Instance, LaunchProgress } from '../shared/types';
import { TitleBar } from './components/TitleBar';
import { InstanceCard } from './components/InstanceCard';
import { AccountsModal } from './components/AccountsModal';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { ModsModal } from './components/ModsModal';
import { LogsModal } from './components/LogsModal';
import { SettingsModal } from './components/SettingsModal';
import { JavaModal } from './components/JavaModal';

export const App: React.FC = () => {
  // State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | undefined>();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLoader, setFilterLoader] = useState<string>('all');

  // Modals state
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isModsOpen, setIsModsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [javaModalData, setJavaModalData] = useState<{
    isOpen: boolean;
    requiredMajor: number;
    mcVersion: string;
    reason?: 'missing' | 'too_old' | 'not_found';
    instanceId?: string;
  }>({
    isOpen: false,
    requiredMajor: 21,
    mcVersion: '1.20',
  });

  // Launch & logs state
  const [launchProgress, setLaunchProgress] = useState<LaunchProgress | null>(null);
  const [runningInstances, setRunningInstances] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Load initial data
  const refreshAccounts = async () => {
    const list = await window.api.accounts.list();
    const active = await window.api.accounts.getActive();
    setAccounts(list);
    setActiveAccount(active);
  };

  const refreshInstances = async () => {
    const list = await window.api.instances.list();
    setInstances(list);
    if (list.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(list[0].id);
    }
  };

  useEffect(() => {
    refreshAccounts();
    refreshInstances();

    const unsubProgress = window.api.launcher.onProgress((progress) => {
      setLaunchProgress(progress);
      if (progress.state === 'running') {
        setRunningInstances((prev) => new Set(prev).add(progress.instanceId));
      } else if (progress.state === 'stopped' || progress.state === 'error') {
        setRunningInstances((prev) => {
          const next = new Set(prev);
          next.delete(progress.instanceId);
          return next;
        });
      }
    });

    const unsubLog = window.api.launcher.onLog(({ line }) => {
      setLogs((prev) => [...prev.slice(-1000), line]);
    });

    return () => {
      unsubProgress();
      unsubLog();
    };
  }, []);

  const handleLaunch = async (instanceId: string) => {
    if (!activeAccount) {
      setErrorToast('Пожалуйста, выберите или добавьте профиль (TLauncher, Ely.by или Offline)');
      setIsAccountsOpen(true);
      return;
    }

    const inst = instances.find((i) => i.id === instanceId);
    if (inst) {
      // Check Java compatibility before launching
      try {
        const javaCheck = await window.api.meta.checkJava(inst.minecraftVersion, inst.javaPath);
        if (!javaCheck.valid) {
          setJavaModalData({
            isOpen: true,
            requiredMajor: javaCheck.requiredMajor,
            mcVersion: inst.minecraftVersion,
            reason: javaCheck.reason,
            instanceId,
          });
          return;
        }
      } catch (e) {
        console.warn('Java check error', e);
      }
    }

    try {
      setErrorToast(null);
      await window.api.launcher.launch(instanceId);
    } catch (err: any) {
      setErrorToast(err.message || 'Ошибка запуска игры');
    }
  };

  const handleKill = async (instanceId: string) => {
    await window.api.launcher.kill(instanceId);
  };

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);
  const isSelectedRunning = selectedInstance ? runningInstances.has(selectedInstance.id) : false;

  const filteredInstances = instances.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.minecraftVersion.includes(searchQuery);
    const matchesLoader = filterLoader === 'all' || i.loaderType === filterLoader;
    return matchesSearch && matchesLoader;
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-nova-black text-nova-text overflow-hidden font-sans select-none relative">
      {/* Ambient NovaCode cyan/blue blur glow spots in background */}
      <div className="nova-ambient-glow" />

      {/* Top Title Bar */}
      <TitleBar
        accounts={accounts}
        activeAccount={activeAccount}
        onSelectAccount={async (id) => {
          await window.api.accounts.setActive(id);
          refreshAccounts();
        }}
        onOpenAccountsModal={() => setIsAccountsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden z-10 relative">
        {/* Left Sidebar (NovaCode Minimalist style) */}
        <aside className="w-52 bg-nova-black/80 backdrop-blur-md border-r border-nova-border flex flex-col justify-between p-3">
          <div className="space-y-1.5">
            {/* Primary Action Button (Pill style like in NovaCode screenshot) */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition duration-150 mb-3"
            >
              <Plus size={14} />
              Новый инстанс
            </button>

            {/* Selected Instance Version Card */}
            {selectedInstance && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-nova-900/80 border border-nova-border text-left">
                <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 mb-0.5">Выбран инстанс</div>
                <div className="text-xs font-semibold text-white truncate">{selectedInstance.name}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-cyan-400">
                  <span>MC {selectedInstance.minecraftVersion}</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-neutral-400 capitalize">{selectedInstance.loaderType}</span>
                </div>
              </div>
            )}

            {/* Launch button */}
            <button
              onClick={() => selectedInstanceId && handleLaunch(selectedInstanceId)}
              disabled={!selectedInstanceId || isSelectedRunning}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition duration-150 ${
                !selectedInstanceId || isSelectedRunning
                  ? 'border border-neutral-900 text-neutral-600 cursor-not-allowed bg-transparent'
                  : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
              }`}
            >
              <Play size={13} fill="currentColor" />
              {isSelectedRunning ? 'Игра запущена' : 'Запустить'}
            </button>

            {/* Content: Mods, Shaders, Resourcepacks */}
            <button
              onClick={() => setIsModsOpen(true)}
              disabled={!selectedInstanceId}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition duration-150 disabled:opacity-30"
            >
              <Package size={14} strokeWidth={1.5} />
              Моды, шейдеры, паки
            </button>

            {/* Folder */}
            <button
              onClick={() => selectedInstanceId && window.api.instances.openFolder(selectedInstanceId)}
              disabled={!selectedInstanceId}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition duration-150 disabled:opacity-30"
            >
              <FolderOpen size={14} strokeWidth={1.5} />
              Папка инстанса
            </button>

            {/* Logs */}
            <button
              onClick={() => setIsLogsOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition duration-150"
            >
              <Terminal size={14} strokeWidth={1.5} />
              Лог консоли
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="pt-2 border-t border-nova-border space-y-1">
            <button
              onClick={() => window.api.app.openExternal('https://github.com/Daigren/DragLauncher/releases')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-cyan-400 hover:bg-white/5 transition duration-150 group"
              title="Проверить обновления на GitHub"
            >
              <div className="flex items-center gap-2.5">
                <GitBranch size={14} strokeWidth={1.5} className="group-hover:text-cyan-400 text-neutral-500 transition" />
                <span>Обновления</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-cyan-500/80">v1.0.0</span>
                <ExternalLink size={10} className="text-neutral-600 group-hover:text-cyan-400 transition" />
              </div>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition duration-150"
            >
              <SettingsIcon size={14} strokeWidth={1.5} />
              Настройки
            </button>
          </div>
        </aside>

        {/* Central Workspace */}
        <main className="flex-1 flex flex-col bg-nova-black/40 overflow-hidden">
          {/* Search & Filter Bar (Inspired directly by the search bar in NovaCode screenshot) */}
          <div className="h-14 border-b border-nova-border px-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5 w-full max-w-md">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-2.5 text-neutral-500" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Найти инстанс"
                  className="w-full bg-nova-900 border border-nova-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-500 transition duration-150"
                />
              </div>

              {/* Minimalist Filter pill button */}
              <button
                onClick={() => {
                  const loaders = ['all', 'fabric', 'forge', 'vanilla'];
                  const nextIdx = (loaders.indexOf(filterLoader) + 1) % loaders.length;
                  setFilterLoader(loaders[nextIdx]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nova-border bg-nova-900 text-xs text-neutral-300 hover:border-neutral-600 transition"
              >
                <SlidersHorizontal size={12} strokeWidth={1.5} />
                <span className="font-mono text-[11px]">
                  {filterLoader === 'all' ? '= фильтры' : filterLoader}
                </span>
              </button>
            </div>

            <div className="text-xs text-neutral-500 font-mono">
              Инстансов: <span className="text-white font-medium">{instances.length}</span>
            </div>
          </div>

          {/* Instances Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {errorToast && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{errorToast}</span>
                </div>
                <button onClick={() => setErrorToast(null)} className="text-rose-400 hover:text-white text-xs">
                  ✕
                </button>
              </div>
            )}

            {filteredInstances.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredInstances.map((inst) => (
                  <InstanceCard
                    key={inst.id}
                    instance={inst}
                    isSelected={selectedInstanceId === inst.id}
                    isRunning={runningInstances.has(inst.id)}
                    onSelect={() => setSelectedInstanceId(inst.id)}
                    onLaunch={() => handleLaunch(inst.id)}
                    onOpenFolder={() => window.api.instances.openFolder(inst.id)}
                    onOpenMods={() => {
                      setSelectedInstanceId(inst.id);
                      setIsModsOpen(true);
                    }}
                    onDelete={async () => {
                      if (confirm(`Удалить инстанс "${inst.name}"?`)) {
                        await window.api.instances.delete(inst.id);
                        refreshInstances();
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-white mb-4">
                  <Box size={26} strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-white text-base mb-1 tracking-tight">Инстансов не найдено</h3>
                <p className="text-xs text-neutral-400 max-w-sm mb-5">
                  Создайте чистый профиль Minecraft или сборку с Fabric/Forge для мгновенного запуска.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-5 py-2 rounded-full border border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition duration-150"
                >
                  Создать первый инстанс
                </button>
              </div>
            )}
          </div>

          {/* Bottom Hairline Progress Indicator */}
          {launchProgress && launchProgress.state !== 'stopped' && (
            <div className="bg-nova-900 border-t border-nova-border p-2.5 px-6 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-medium text-white">{launchProgress.step}</span>
              </div>
              <div className="w-48 bg-nova-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-150"
                  style={{ width: `${launchProgress.current}%` }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals in NovaCode Dark Style */}
      <AccountsModal
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        accounts={accounts}
        activeAccount={activeAccount}
        onRefresh={refreshAccounts}
      />

      <CreateInstanceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={refreshInstances}
      />

      {selectedInstance && (
        <ModsModal
          isOpen={isModsOpen}
          onClose={() => setIsModsOpen(false)}
          instance={selectedInstance}
        />
      )}

      <LogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onClear={() => setLogs([])}
        instanceName={selectedInstance?.name}
        isRunning={isSelectedRunning}
        onKillInstance={() => selectedInstance && handleKill(selectedInstance.id)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <JavaModal
        isOpen={javaModalData.isOpen}
        onClose={() => setJavaModalData({ ...javaModalData, isOpen: false })}
        requiredMajor={javaModalData.requiredMajor}
        mcVersion={javaModalData.mcVersion}
        reason={javaModalData.reason}
        onJavaConfigured={() => {
          if (javaModalData.instanceId) {
            handleLaunch(javaModalData.instanceId);
          }
        }}
      />
    </div>
  );
};
