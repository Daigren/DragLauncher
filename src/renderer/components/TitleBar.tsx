import React, { useState } from 'react';
import { Minus, Square, X, User, ChevronDown, Plus, Shield, GitBranch, ExternalLink } from 'lucide-react';
import { Account } from '../../shared/types';

interface TitleBarProps {
  accounts: Account[];
  activeAccount?: Account;
  onSelectAccount: (id: string) => void;
  onOpenAccountsModal: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  accounts,
  activeAccount,
  onSelectAccount,
  onOpenAccountsModal,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getAccountBadge = (type: string) => {
    switch (type) {
      case 'tlauncher':
        return <span className="border border-white/20 text-neutral-300 text-[10px] px-2 py-0.5 rounded-full font-mono">TLauncher</span>;
      case 'elyby':
        return <span className="border border-cyan-500/30 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full font-mono">Ely.by</span>;
      case 'microsoft':
        return <span className="border border-white/30 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">MS</span>;
      default:
        return <span className="border border-neutral-800 text-neutral-400 text-[10px] px-2 py-0.5 rounded-full font-mono">Offline</span>;
    }
  };

  return (
    <div className="h-11 bg-nova-black/95 backdrop-blur-md border-b border-nova-border flex items-center justify-between px-4 select-none titlebar-drag z-50 relative">
      {/* Brand & Logo (NovaCode style) */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-md border border-white/20 flex items-center justify-center bg-white/5">
          <div className="w-2.5 h-2.5 border-t border-l border-white rotate-45" />
        </div>
        <span className="font-bold text-xs tracking-tight text-white flex items-center gap-1.5">
          Drag<span className="text-neutral-400 font-normal">Launcher</span>
        </span>

        {/* GitHub Updates Link */}
        <button
          onClick={() => window.api.app.openExternal('https://github.com/Daigren/DragLauncher/releases')}
          className="ml-2 flex items-center gap-1.5 border border-white/10 hover:border-cyan-500/40 hover:text-cyan-400 bg-nova-900/80 px-2.5 py-0.5 rounded-full text-[11px] text-neutral-400 transition titlebar-nodrag group"
          title="Открыть страницу обновлений на GitHub"
        >
          <GitBranch size={11} className="text-neutral-500 group-hover:text-cyan-400 transition" />
          <span>v1.0.0</span>
          <span className="text-[10px] text-neutral-600 group-hover:text-cyan-500/70 transition">Обновления</span>
          <ExternalLink size={10} className="text-neutral-600 group-hover:text-cyan-400 opacity-60 group-hover:opacity-100 transition" />
        </button>
      </div>

      {/* Account Switcher - Minimalist Pill */}
      <div className="relative titlebar-nodrag">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 border border-white/15 hover:border-white/30 bg-nova-900/80 px-3 py-1 rounded-full text-xs transition duration-150"
        >
          {activeAccount ? (
            <>
              <img
                src={`https://minotar.net/avatar/${activeAccount.username}/18.png`}
                alt="avatar"
                className="w-3.5 h-3.5 rounded-full border border-white/20"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-medium text-white text-xs">{activeAccount.username}</span>
              {getAccountBadge(activeAccount.type)}
            </>
          ) : (
            <span className="text-neutral-400 flex items-center gap-1.5 text-xs">
              <User size={12} />
              Выбрать профиль
            </span>
          )}
          <ChevronDown size={12} className="text-neutral-500 ml-0.5" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full mt-2 right-0 w-64 bg-nova-900 border border-nova-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500 border-b border-nova-border">
              Профили
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-nova-800 transition ${
                    activeAccount?.id === acc.id ? 'bg-nova-850 font-medium' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://minotar.net/avatar/${acc.username}/18.png`}
                      alt=""
                      className="w-3.5 h-3.5 rounded-full"
                    />
                    <span className="text-xs text-neutral-200">{acc.username}</span>
                  </div>
                  {getAccountBadge(acc.type)}
                </button>
              ))}
              {accounts.length === 0 && (
                <div className="px-3 py-3 text-xs text-neutral-500 text-center">Нет добавленных профилей</div>
              )}
            </div>
            <div className="border-t border-nova-border p-1.5">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenAccountsModal();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/10 hover:border-white/30 bg-nova-850 text-xs text-white transition"
              >
                <Plus size={12} />
                Управление аккаунтами
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Window Controls */}
      <div className="flex items-center titlebar-nodrag -mr-1">
        <button
          onClick={() => window.api.window.minimize()}
          className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-nova-800 rounded-md transition"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.api.window.maximize()}
          className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-nova-800 rounded-md transition"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.api.window.close()}
          className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-rose-500/20 rounded-md transition"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
