import React, { useState, useEffect } from 'react';
import { X, Coffee, Download, ExternalLink, FolderOpen, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface JavaModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredMajor: number;
  mcVersion: string;
  reason?: 'missing' | 'too_old' | 'not_found';
  onJavaConfigured: () => void;
}

export const JavaModal: React.FC<JavaModalProps> = ({
  isOpen,
  onClose,
  requiredMajor,
  mcVersion,
  reason,
  onJavaConfigured,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDownloading(false);
      setDownloadProgress(0);
      setStatusMessage(null);
      setError(null);
      return;
    }

    const unsub = window.api.meta.onJavaDownloadProgress((pct) => {
      setDownloadProgress(pct);
    });

    return () => {
      unsub();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadInstaller = async () => {
    try {
      setError(null);
      setDownloading(true);
      setStatusMessage('Загрузка официального установщика Eclipse Temurin JDK...');
      await window.api.meta.downloadJavaInstaller(requiredMajor);
      setStatusMessage('Установщик запущен. Завершите установку в открывшемся окне, затем нажмите «Проверить снова».');
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки установщика Java');
    } finally {
      setDownloading(false);
    }
  };

  const handleSelectManually = async () => {
    try {
      const selectedExe = await window.api.meta.selectJavaExe();
      if (selectedExe) {
        // Save as default in settings
        await window.api.settings.update({ defaultJavaPath: selectedExe });
        handleCheckAgain();
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка выбора файла');
    }
  };

  const handleCheckAgain = async () => {
    try {
      const check = await window.api.meta.checkJava(mcVersion);
      if (check.valid) {
        onJavaConfigured();
        onClose();
      } else {
        setError(`Java ${requiredMajor} всё ещё не обнаружена в системе. Убедитесь, что установка завершена.`);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка повторной проверки');
    }
  };

  const getReasonText = () => {
    if (reason === 'too_old') {
      return `Для Minecraft ${mcVersion} требуется Java ${requiredMajor} (64-bit), а на компьютере установлена более старая версия.`;
    }
    if (reason === 'not_found') {
      return `Указанный путь к java.exe недействителен или файл был перемещен.`;
    }
    return `Для запуска Minecraft ${mcVersion} необходима среда выполнения Java ${requiredMajor} (64-bit), но она не найдена на вашем компьютере.`;
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-nova-900 border border-nova-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-nova-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Coffee size={16} />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm tracking-tight">Требуется Java {requiredMajor}</h2>
              <div className="text-[11px] text-neutral-500 font-mono">Minecraft {mcVersion}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-nova-950 border border-nova-border">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-300 leading-relaxed">{getReasonText()}</p>
          </div>

          {/* Download Progress */}
          {downloading && (
            <div className="p-3.5 rounded-xl bg-nova-950 border border-cyan-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-400 font-medium flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Загрузка Java {requiredMajor} (Adoptium)...
                </span>
                <span className="font-mono text-white text-xs">{downloadProgress}%</span>
              </div>
              <div className="w-full bg-nova-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-150"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {statusMessage && !downloading && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleDownloadInstaller}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition duration-150 shadow-md disabled:opacity-50"
            >
              <Download size={14} />
              {downloading ? 'Загрузка...' : `Скачать и установить Java ${requiredMajor}`}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSelectManually}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 hover:border-white/30 bg-nova-950 text-xs text-neutral-300 hover:text-white transition"
              >
                <FolderOpen size={13} />
                Указать вручную
              </button>

              <button
                onClick={() =>
                  window.api.app.openExternal(`https://adoptium.net/temurin/releases/?version=${requiredMajor}`)
                }
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/10 hover:border-white/30 bg-nova-950 text-xs text-neutral-300 hover:text-white transition"
              >
                <ExternalLink size={13} />
                Сайт Adoptium
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-nova-950/60 border-t border-nova-border flex items-center justify-between text-xs">
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition">
            Отмена
          </button>
          <button
            onClick={handleCheckAgain}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/40 text-neutral-200 hover:text-white bg-nova-850 hover:bg-nova-800 transition"
          >
            <RefreshCw size={12} />
            Проверить снова
          </button>
        </div>
      </div>
    </div>
  );
};
