import React, { useRef, useEffect } from 'react';
import { X, Terminal, Trash2, Copy, AlertOctagon } from 'lucide-react';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  onClear: () => void;
  instanceName?: string;
  onKillInstance?: () => void;
  isRunning?: boolean;
}

export const LogsModal: React.FC<LogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClear,
  instanceName,
  onKillInstance,
  isRunning,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
  };

  const formatLogLine = (line: string, index: number) => {
    let color = 'text-neutral-400';
    if (line.includes('[STDERR]') || line.includes('[ERROR]') || line.includes('[CRASH]')) {
      color = 'text-rose-400';
    } else if (line.includes('[WARN]')) {
      color = 'text-amber-300';
    } else if (line.includes('[DragLauncher]')) {
      color = 'text-white font-medium';
    }

    return (
      <div key={index} className={`font-mono text-xs leading-5 select-text ${color}`}>
        {line}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-nova-black border border-nova-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-nova-border flex items-center justify-between bg-nova-950">
          <div className="flex items-center gap-2.5">
            <Terminal className="text-white" size={16} strokeWidth={1.5} />
            <h2 className="font-semibold text-white text-xs tracking-tight">
              Консоль {instanceName ? `— ${instanceName}` : ''}
            </h2>
            {isRunning && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/20 text-white text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                running
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRunning && onKillInstance && (
              <button
                onClick={onKillInstance}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-mono transition"
              >
                <AlertOctagon size={12} />
                Остановить
              </button>
            )}
            <button
              onClick={copyToClipboard}
              className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/5 transition"
              title="Скопировать"
            >
              <Copy size={13} strokeWidth={1.5} />
            </button>
            <button
              onClick={onClear}
              className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-white/5 transition"
              title="Очистить"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition ml-1">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-nova-black font-mono text-xs">
          {logs.map((line, idx) => formatLogLine(line, idx))}
          {logs.length === 0 && (
            <div className="text-neutral-700 italic">Логи пока пусты. Запустите инстанс...</div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
