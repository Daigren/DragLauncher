import React, { useState, useEffect } from 'react';
import { X, Settings, Coffee, HardDrive, Cpu } from 'lucide-react';
import { AppSettings } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [javaList, setJavaList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.api.settings.get().then(setSettings);
      window.api.meta.detectJava().then(setJavaList);
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await window.api.settings.update(settings);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !settings) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-nova-900 border border-nova-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-nova-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="text-white" size={16} strokeWidth={1.5} />
            <h2 className="font-semibold text-white text-sm tracking-tight">Настройки лаунчера</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Java Selection */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
              <Coffee size={13} strokeWidth={1.5} />
              Версия Java по умолчанию
            </label>
            <select
              value={settings.defaultJavaPath}
              onChange={(e) => setSettings({ ...settings, defaultJavaPath: e.target.value })}
              className="w-full bg-nova-950 border border-nova-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-neutral-500 font-mono"
            >
              <option value="java">Автоматический выбор (рекомендуется)</option>
              {javaList.map((j) => (
                <option key={j.path} value={j.path}>
                  Java {j.majorVersion} ({j.versionString}) — {j.path}
                </option>
              ))}
            </select>
          </div>

          {/* Memory */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Cpu size={13} strokeWidth={1.5} />
                Максимальная память (RAM)
              </span>
              <span className="text-white font-mono">{settings.defaultMaxMemory} МБ</span>
            </div>
            <input
              type="range"
              min="1024"
              max="16384"
              step="512"
              value={settings.defaultMaxMemory}
              onChange={(e) => setSettings({ ...settings, defaultMaxMemory: parseInt(e.target.value, 10) })}
              className="w-full accent-white"
            />
          </div>

          {/* JVM Args */}
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Флаги JVM по умолчанию</label>
            <textarea
              rows={2}
              value={settings.defaultJvmArgs}
              onChange={(e) => setSettings({ ...settings, defaultJvmArgs: e.target.value })}
              className="w-full bg-nova-950 border border-nova-border rounded-lg p-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-neutral-500"
            />
          </div>

          {/* Instances Dir */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 flex items-center gap-1.5">
              <HardDrive size={13} strokeWidth={1.5} />
              Директория инстансов
            </label>
            <input
              type="text"
              readOnly
              value={settings.instancesDir}
              className="w-full bg-nova-950 border border-nova-border rounded-lg px-3 py-2 text-xs text-neutral-500 font-mono"
            />
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
              disabled={saving}
              className="px-5 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-xs text-black font-medium transition duration-150 disabled:opacity-40"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
