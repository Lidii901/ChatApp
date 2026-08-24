import React from 'react';
import { X, Activity, AlertTriangle, CheckCircle2, Clock, Trash2, Cpu } from 'lucide-react';
import { ApiLog } from '../types';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ApiLog[];
  onClearLogs: () => void;
  serverStatus: {
    status: string;
    provider?: string;
    model?: string;
    deanModel?: string;
    imitateModel?: string;
    defaultProvider?: string;
    defaultModel?: string;
    hasKey?: boolean;
  } | null;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  serverStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="diagnostics-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h2 className="font-serif text-base font-semibold text-zinc-100">
              Echtzeit-Überwachung & Logs
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            title="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed text-zinc-300">
          {/* Server / Backend status */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Server & OpenRouter Status</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{serverStatus?.status === 'ok' ? 'Bereit' : 'Wird geladen'}</span>
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-zinc-400">
              <div className="flex justify-between">
                <span>API-Anbieter:</span>
                <span className="text-zinc-200 uppercase font-semibold">OpenRouter</span>
              </div>
              <div className="flex justify-between">
                <span>Dean Chat Modell:</span>
                <span className="text-amber-300 font-mono">{serverStatus?.deanModel || 'nvidia/nemotron-3-super-120b-a12b:free'}</span>
              </div>
              <div className="flex justify-between">
                <span>Imitate Me Modell:</span>
                <span className="text-amber-300 font-mono">{serverStatus?.imitateModel || 'nvidia/nemotron-3-ultra-550b-a55b:free'}</span>
              </div>
            </div>
            {serverStatus?.hasKey === false && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-900/50">
                Warnung: Kein OPENROUTER_API_KEY im Server gefunden. Bitte in den Secrets konfigurieren.
              </div>
            )}
          </div>

          {/* Logs List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">
                Echtzeit-Protokoll ({logs.length} Einträge)
              </span>
              {logs.length > 0 && (
                <button
                  onClick={onClearLogs}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Logs leeren</span>
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-zinc-400">
                Noch keine API-Aufrufe protokolliert.
              </div>
            ) : (
              <div className="space-y-2">
                {[...logs].reverse().map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-xl border p-3 font-mono text-[11px] ${
                      log.status === 'error'
                        ? 'border-rose-800/60 bg-rose-950/20 text-rose-300'
                        : log.status === 'pending'
                        ? 'border-amber-800/60 bg-amber-950/20 text-amber-300'
                        : 'border-zinc-800 bg-zinc-900/80 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {log.status === 'error' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                        ) : log.status === 'pending' ? (
                          <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        <span className="font-bold uppercase">{log.type}</span>
                        <span className="text-zinc-400">({log.model})</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                        {log.latencyMs ? ` • ${log.latencyMs}ms` : ''}
                      </span>
                    </div>

                    {log.message && (
                      <div className="mt-1 font-sans text-xs text-zinc-200 break-words">
                        {log.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-950 p-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
