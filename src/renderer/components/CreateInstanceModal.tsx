import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import { MinecraftVersionMeta, ModLoaderType } from '../../shared/types';

interface CreateInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [versions, setVersions] = useState<MinecraftVersionMeta[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('1.20.4');
  const [loaderType, setLoaderType] = useState<ModLoaderType>('fabric');
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [maxMemory, setMaxMemory] = useState<number>(4096);
  const [icon, setIcon] = useState('grass');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.api.meta.getMinecraftVersions().then((list) => {
        setVersions(list);
        const latestRelease = list.find((v) => v.type === 'release');
        if (latestRelease) {
          setSelectedVersion(latestRelease.id);
          setName(`Minecraft ${latestRelease.id}`);
        }
      });
    }
  }, [isOpen]);

  const handleVersionChange = (ver: string) => {
    setSelectedVersion(ver);
    setName(`Minecraft ${ver}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      await window.api.instances.create({
        name: name.trim(),
        minecraftVersion: selectedVersion,
        loaderType,
        icon,
        maxMemory,
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredVersions = versions.filter((v) => showSnapshots || v.type === 'release');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-nova-900 border border-nova-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-nova-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-white" size={16} strokeWidth={1.5} />
            <h2 className="font-semibold text-white text-sm tracking-tight">Создание нового инстанса</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Название инстанса</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-nova-950 border border-nova-border rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-neutral-500 transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-neutral-400">Версия Minecraft</label>
                <label className="flex items-center gap-1 text-[10px] text-neutral-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSnapshots}
                    onChange={(e) => setShowSnapshots(e.target.checked)}
                    className="rounded border-neutral-700 bg-nova-950 text-white focus:ring-0"
                  />
                  Снапшоты
                </label>
              </div>
              <select
                value={selectedVersion}
                onChange={(e) => handleVersionChange(e.target.value)}
                className="w-full bg-nova-950 border border-nova-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-neutral-500 font-mono"
              >
                {filteredVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id} {v.type !== 'release' ? `(${v.type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Мод-лоадер</label>
              <select
                value={loaderType}
                onChange={(e) => setLoaderType(e.target.value as ModLoaderType)}
                className="w-full bg-nova-950 border border-nova-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-neutral-500 font-mono"
              >
                <option value="vanilla">Vanilla (Официальный)</option>
                <option value="fabric">Fabric Loader</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
                <option value="quilt">Quilt</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-neutral-400">Выделение оперативной памяти</span>
              <span className="text-white font-mono">{maxMemory} МБ ({(maxMemory / 1024).toFixed(1)} ГБ)</span>
            </div>
            <input
              type="range"
              min="1024"
              max="16384"
              step="512"
              value={maxMemory}
              onChange={(e) => setMaxMemory(parseInt(e.target.value, 10))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-[10px] text-neutral-600 font-mono mt-1">
              <span>1 ГБ</span>
              <span>4 ГБ</span>
              <span>8 ГБ</span>
              <span>16 ГБ</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex justify-end gap-2 border-t border-nova-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full border border-white/10 hover:border-white/30 text-xs text-neutral-400 hover:text-white transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-xs text-black font-medium transition duration-150 disabled:opacity-40"
            >
              {loading ? 'Создание...' : 'Создать инстанс'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
