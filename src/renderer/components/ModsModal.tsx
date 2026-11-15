import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Download,
  Search,
  FolderOpen,
  Trash2,
  Power,
  Sparkles,
  Layers,
  Palette,
  SunMedium,
} from 'lucide-react';
import { Instance, ContentItem, ContentType } from '../../shared/types';

interface ModsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instance: Instance;
  initialType?: ContentType;
}

export const ModsModal: React.FC<ModsModalProps> = ({
  isOpen,
  onClose,
  instance,
  initialType = 'mod',
}) => {
  const [contentType, setContentType] = useState<ContentType>(initialType);
  const [viewTab, setViewTab] = useState<'installed' | 'modrinth'>('installed');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

  const loadInstalledItems = (type: ContentType) => {
    window.api.content.list(instance.id, type).then(setItems);
  };

  useEffect(() => {
    if (isOpen) {
      loadInstalledItems(contentType);
      setSearchResults([]);
      setSearchQuery('');
    }
  }, [isOpen, instance.id, contentType]);

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    loadInstalledItems(type);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleToggle = async (fileName: string) => {
    await window.api.content.toggle(instance.id, contentType, fileName);
    loadInstalledItems(contentType);
  };

  const handleDelete = async (fileName: string) => {
    await window.api.content.delete(instance.id, contentType, fileName);
    loadInstalledItems(contentType);
  };

  const handleOpenFolder = () => {
    window.api.content.openFolder(instance.id, contentType);
  };

  const handleSearchModrinth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const results = await window.api.content.search(
        searchQuery,
        contentType,
        instance.minecraftVersion,
        instance.loaderType
      );
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstall = async (projectId: string) => {
    setInstallingIds((prev) => new Set(prev).add(projectId));
    try {
      await window.api.content.install(
        instance.id,
        projectId,
        contentType,
        instance.minecraftVersion,
        instance.loaderType
      );
      loadInstalledItems(contentType);
    } catch (err: any) {
      alert(`Ошибка загрузки: ${err.message}`);
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  const getTypeLabel = () => {
    switch (contentType) {
      case 'resourcepack':
        return 'Ресурс-паки';
      case 'shader':
        return 'Шейдеры';
      default:
        return 'Моды';
    }
  };

  const getSubfolderPath = () => {
    switch (contentType) {
      case 'resourcepack':
        return '.minecraft/resourcepacks';
      case 'shader':
        return '.minecraft/shaderpacks';
      default:
        return '.minecraft/mods';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-nova-900 border border-nova-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[82vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-nova-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="text-white" size={16} strokeWidth={1.5} />
            <h2 className="font-semibold text-white text-sm tracking-tight">
              Контент инстанса <span className="text-neutral-500 font-normal">— {instance.name}</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Type Selector (Pill tabs in NovaCode style) */}
        <div className="px-5 py-2.5 bg-nova-950 border-b border-nova-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-nova-900 rounded-full border border-nova-border">
            <button
              onClick={() => handleContentTypeChange('mod')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition duration-150 ${
                contentType === 'mod'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers size={12} strokeWidth={1.5} />
              Моды
            </button>
            <button
              onClick={() => handleContentTypeChange('resourcepack')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition duration-150 ${
                contentType === 'resourcepack'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Palette size={12} strokeWidth={1.5} />
              Ресурс-паки
            </button>
            <button
              onClick={() => handleContentTypeChange('shader')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition duration-150 ${
                contentType === 'shader'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <SunMedium size={12} strokeWidth={1.5} />
              Шейдеры
            </button>
          </div>

          <span className="text-[11px] font-mono text-neutral-500">{getSubfolderPath()}</span>
        </div>

        {/* View Sub-Tabs (Installed vs Modrinth) */}
        <div className="flex border-b border-nova-border bg-nova-black px-5 pt-2.5 gap-6 text-xs font-medium">
          <button
            onClick={() => setViewTab('installed')}
            className={`pb-2.5 border-b-2 transition duration-150 ${
              viewTab === 'installed'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Установленные ({items.length})
          </button>
          <button
            onClick={() => setViewTab('modrinth')}
            className={`pb-2.5 border-b-2 transition duration-150 ${
              viewTab === 'modrinth'
                ? 'border-white text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Каталог Modrinth ({getTypeLabel()})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewTab === 'installed' ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-neutral-400">
                  Всего файлов: <span className="font-mono text-white">{items.length}</span>
                </span>
                <button
                  onClick={handleOpenFolder}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 hover:border-white/30 text-xs text-neutral-300 transition"
                >
                  <FolderOpen size={12} strokeWidth={1.5} />
                  Открыть папку
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    item.enabled
                      ? 'bg-nova-950 border-nova-border'
                      : 'bg-nova-950/40 border-nova-border opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(item.fileName)}
                      className={`p-1.5 rounded-md transition ${
                        item.enabled
                          ? 'text-white hover:bg-white/10'
                          : 'text-neutral-600 hover:bg-white/5'
                      }`}
                      title={item.enabled ? 'Отключить' : 'Включить'}
                    >
                      <Power size={13} strokeWidth={1.5} />
                    </button>
                    <div>
                      <div className="text-xs font-medium text-white">{item.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{item.fileName}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.fileName)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-md hover:bg-white/5 transition"
                    title="Удалить файл"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-12 text-xs text-neutral-500">
                  В этом инстансе пока нет установленных {getTypeLabel().toLowerCase()}.
                  <div className="mt-2 text-neutral-600">
                    Перейдите во вкладку «Каталог Modrinth» выше для поиска и скачивания в 1 клик.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleSearchModrinth} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-2.5 text-neutral-500" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Найти ${getTypeLabel().toLowerCase()} на Modrinth...`}
                    className="w-full bg-nova-950 border border-nova-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-hidden focus:border-neutral-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-1.5 bg-white text-black rounded-lg text-xs font-medium hover:bg-neutral-200 transition"
                >
                  {isSearching ? 'Поиск...' : 'Найти'}
                </button>
              </form>

              <div className="space-y-2">
                {searchResults.map((item) => (
                  <div
                    key={item.project_id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-nova-950 border border-nova-border hover:border-nova-border-hover transition"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon_url ? (
                        <img src={item.icon_url} alt="" className="w-8 h-8 rounded-md object-contain bg-black p-0.5" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-nova-850 flex items-center justify-center text-neutral-400">
                          {contentType === 'shader' ? (
                            <SunMedium size={16} strokeWidth={1.5} />
                          ) : contentType === 'resourcepack' ? (
                            <Palette size={16} strokeWidth={1.5} />
                          ) : (
                            <Package size={16} strokeWidth={1.5} />
                          )}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          {item.title}
                          <span className="text-[10px] text-neutral-500 font-normal">от {item.author}</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 max-w-md mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInstall(item.project_id)}
                      disabled={installingIds.has(item.project_id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition disabled:opacity-40"
                    >
                      <Download size={11} strokeWidth={1.5} />
                      {installingIds.has(item.project_id) ? 'Загрузка...' : 'Установить'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
