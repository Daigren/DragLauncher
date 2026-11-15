import React, { useState } from 'react';
import { X, User, Trash2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { Account, AccountType } from '../../shared/types';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  activeAccount?: Account;
  onRefresh: () => void;
}

export const AccountsModal: React.FC<AccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<AccountType>('tlauncher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (activeTab === 'offline') {
        if (!username.trim()) throw new Error('Введите никнейм игрока');
        await window.api.accounts.addOffline(username.trim());
      } else if (activeTab === 'tlauncher') {
        if (!username.trim() || !password) throw new Error('Введите логин и пароль TLauncher');
        await window.api.accounts.addTLauncher(username.trim(), password);
      } else if (activeTab === 'elyby') {
        if (!username.trim() || !password) throw new Error('Введите логин и пароль Ely.by');
        await window.api.accounts.addElyBy(username.trim(), password);
      }
      setUsername('');
      setPassword('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Ошибка добавления аккаунта');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    await window.api.accounts.remove(id);
    onRefresh();
  };

  const handleSetActive = async (id: string) => {
    await window.api.accounts.setActive(id);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-nova-900 border border-nova-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-nova-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="text-white" size={16} strokeWidth={1.5} />
            <h2 className="font-semibold text-white text-sm tracking-tight">Управление профилями</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* List of existing accounts */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
              Подключенные аккаунты ({accounts.length})
            </div>
            <div className="space-y-1.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    activeAccount?.id === acc.id
                      ? 'bg-nova-850 border-white/30'
                      : 'bg-nova-950 border-nova-border hover:border-nova-border-hover'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://minotar.net/avatar/${acc.username}/32.png`}
                      alt=""
                      className="w-7 h-7 rounded-full border border-white/10"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-white">{acc.username}</span>
                        {acc.type === 'tlauncher' && (
                          <span className="border border-white/20 text-neutral-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                            TLauncher
                          </span>
                        )}
                        {acc.type === 'elyby' && (
                          <span className="border border-cyan-500/30 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                            Ely.by
                          </span>
                        )}
                        {acc.type === 'offline' && (
                          <span className="border border-neutral-800 text-neutral-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                            Offline
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        UUID: {acc.uuid.substring(0, 16)}...
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activeAccount?.id === acc.id ? (
                      <span className="flex items-center gap-1 text-white text-xs font-mono px-2.5 py-1 rounded-full border border-white/30 bg-white/5">
                        <CheckCircle2 size={11} />
                        Активен
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetActive(acc.id)}
                        className="text-xs px-3 py-1 rounded-full border border-white/15 hover:border-white/40 text-neutral-300 transition"
                      >
                        Выбрать
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(acc.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-md hover:bg-white/5 transition"
                      title="Удалить"
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="text-center py-4 text-xs text-neutral-500 border border-dashed border-nova-border rounded-xl">
                  Аккаунтов пока нет. Добавьте свой аккаунт ниже.
                </div>
              )}
            </div>
          </div>

          {/* Add Account Section */}
          <div className="bg-nova-950 border border-nova-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
              <Shield size={13} strokeWidth={1.5} />
              Добавить аккаунт
            </h3>

            {/* Type tabs (Pill style) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-nova-900 rounded-lg mb-3.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('tlauncher')}
                className={`py-1.5 rounded-md transition ${
                  activeTab === 'tlauncher'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                TLauncher
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('elyby')}
                className={`py-1.5 rounded-md transition ${
                  activeTab === 'elyby'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Ely.by
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('offline')}
                className={`py-1.5 rounded-md transition ${
                  activeTab === 'offline'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Offline
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  {activeTab === 'offline' ? 'Никнейм игрока' : 'Логин или Email'}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activeTab === 'offline' ? 'Steve' : 'user@example.com'}
                  className="w-full bg-nova-900 border border-nova-border rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-neutral-500 transition"
                  required
                />
              </div>

              {activeTab !== 'offline' && (
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-nova-900 border border-nova-border rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-neutral-500 transition"
                    required
                  />
                  <div className="mt-1 text-[10px] text-neutral-500">
                    {activeTab === 'tlauncher'
                      ? 'Авторизация tlauncher.org. Скины и плащи подгружаются автоматически.'
                      : 'Авторизация Ely.by с внедрением authlib-injector.'}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2 px-4 rounded-full bg-white hover:bg-neutral-200 text-black font-medium text-xs transition duration-150 disabled:opacity-40"
              >
                {loading ? 'Авторизация...' : 'Добавить профиль'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
