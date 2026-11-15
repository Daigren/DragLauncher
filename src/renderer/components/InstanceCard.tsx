import React from 'react';
import { Play, FolderOpen, Package, Trash2, Box, Clock } from 'lucide-react';
import { Instance } from '../../shared/types';

interface InstanceCardProps {
  instance: Instance;
  isSelected: boolean;
  onSelect: () => void;
  onLaunch: () => void;
  onOpenFolder: () => void;
  onOpenMods: () => void;
  onDelete: () => void;
  isRunning?: boolean;
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  isSelected,
  onSelect,
  onLaunch,
  onOpenFolder,
  onOpenMods,
  onDelete,
  isRunning,
}) => {
  const formatTime = (seconds?: number) => {
    if (!seconds) return '0 ч.';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} ч. ${mins} м.`;
    return `${mins} м.`;
  };

  const getLoaderBadge = (loader: string) => {
    switch (loader) {
      case 'fabric':
        return <span className="border border-white/15 text-neutral-300 text-[10px] px-2 py-0.5 rounded-full font-mono">Fabric</span>;
      case 'forge':
        return <span className="border border-white/15 text-neutral-300 text-[10px] px-2 py-0.5 rounded-full font-mono">Forge</span>;
      case 'neoforge':
        return <span className="border border-cyan-500/30 text-cyan-400 text-[10px] px-2 py-0.5 rounded-full font-mono">NeoForge</span>;
      case 'quilt':
        return <span className="border border-white/15 text-neutral-300 text-[10px] px-2 py-0.5 rounded-full font-mono">Quilt</span>;
      default:
        return <span className="border border-neutral-800 text-neutral-500 text-[10px] px-2 py-0.5 rounded-full font-mono">Vanilla</span>;
    }
  };

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onLaunch}
      className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
        isSelected
          ? 'bg-nova-900 border-white/30 shadow-2xl'
          : 'bg-nova-950/70 border-nova-border hover:border-nova-border-hover hover:bg-nova-900/50'
      }`}
    >
      <div>
        {/* Top: Icon & Tags */}
        <div className="flex items-start justify-between mb-3.5">
          <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white">
            <Box size={20} strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {getLoaderBadge(instance.loaderType)}
            <span className="text-[11px] font-mono text-neutral-400">{instance.minecraftVersion}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-white group-hover:text-neutral-200 transition line-clamp-1 mb-1 tracking-tight">
          {instance.name}
        </h3>

        {/* Info */}
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mb-4">
          <Clock size={11} strokeWidth={1.5} />
          <span>{formatTime(instance.totalPlayTime)}</span>
        </div>
      </div>

      {/* Action buttons (NovaCode pill style) */}
      <div className="flex items-center justify-between pt-3 border-t border-nova-border">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLaunch();
          }}
          disabled={isRunning}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition duration-150 ${
            isRunning
              ? 'border border-neutral-800 text-neutral-500 cursor-not-allowed'
              : isSelected
              ? 'bg-white text-black hover:bg-neutral-200'
              : 'border border-white/20 text-white hover:border-white/50 hover:bg-white/5'
          }`}
        >
          <Play size={11} fill="currentColor" />
          {isRunning ? 'Запущено' : 'Играть'}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMods();
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/5 transition"
            title="Моды"
          >
            <Package size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder();
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/5 transition"
            title="Папка инстанса"
          >
            <FolderOpen size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-md hover:bg-white/5 transition"
            title="Удалить"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
