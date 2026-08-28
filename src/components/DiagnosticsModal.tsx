import React, { useState, useEffect } from 'react';
import { X, Activity, AlertTriangle, CheckCircle2, Clock, Trash2, Cpu, Eye, Code, Terminal, RefreshCw } from 'lucide-react';
import { ApiLog, Character, ChatSession, ModelSettings } from '../types';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ApiLog[];
  onClearLogs: () => void;
  serverStatus: {
    status: string;
    provider?: string;
    model?: string;
    chatModel?: string;
    imitateModel?: string;
    defaultProvider?: string;
    defaultModel?: string;
    hasKey?: boolean;
  } | null;
  activeCharacter?: Character;
  activeChat?: ChatSession;
  settings?: ModelSettings;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  serverStatus,
  activeCharacter,
  activeChat,
  settings,
}) => {
  const [tab, setTab] = useState<'logs' | 'inspector'>('inspector');
  const [backendInspection, setBackendInspection] = useState<any>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeCharacter) return;
    let isSubscribed = true;

    const fetchInspection = async () => {
      setIsLoadingBackend(true);
      try {
        const res = await fetch('/api/debug/inspect-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: activeCharacter.id,
            chatId: activeChat?.id,
            character: activeCharacter,
            messages: activeChat?.messages || [],
            storyContext: activeChat?.storyContext,
            language: activeChat?.language || 'de',
            settings: settings || {},
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed) {
            setBackendInspection(data);
          }
        }
      } catch (err) {
        console.warn('Inspect prompt error', err);
      } finally {
        if (isSubscribed) setIsLoadingBackend(false);
      }
    };

    fetchInspection();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, activeCharacter, activeChat, settings]);

  if (!isOpen) return null;

  const charName = activeCharacter?.name || 'Character';
  const playerAddress = activeCharacter?.playerAddressName || 'User';

  const firstMesSource = activeCharacter?.firstMes
    ? 'Card data.first_mes'
    : activeCharacter?.startPrompt
    ? 'Card startPrompt / first_mes'
    : 'Keine (wird dynamisch generiert)';

  const firstMesContent = activeCharacter?.firstMes || activeCharacter?.startPrompt || '—';
  const resolvedFirstMes = firstMesContent
    .replace(/{{char}}/gi, charName)
    .replace(/{{user}}/gi, playerAddress);

  const alternateGreetings = activeCharacter?.alternateGreetings || [];
  const scenario = activeCharacter?.scenario || activeChat?.storyContext?.currentScene || activeCharacter?.startPlot || '—';
  const systemPrompt = activeCharacter?.systemPrompt || '(Standard leer gemäss Chub / CCv2 Spezifikation)';
  const postHistory = activeCharacter?.postHistoryInstructions || '(Standard leer gemäss Chub / CCv2 Spezifikation)';
  const exampleDialogue = activeCharacter?.mesExample || activeCharacter?.exampleDialogues || '(Keine mes_example definiert)';
  const characterBook = activeCharacter?.characterBook;
  const messagesCount = activeChat?.messages?.length || 0;
  const lastUserMsg = activeChat?.messages
    ?.slice()
    .reverse()
    .find((m) => m.role === 'lidii' || m.role === 'user');

  return (
    <div
      id="diagnostics-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-400" />
            <h2 className="font-serif text-base font-semibold text-zinc-100">
              Prompt Inspector & System-Diagnose
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

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setTab('inspector')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              tab === 'inspector'
                ? 'border-rose-500 text-rose-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Prompt Inspector (Chub / CCv2)</span>
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              tab === 'logs'
                ? 'border-rose-500 text-rose-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Echtzeit-Logs ({logs.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed text-zinc-300">
          {tab === 'inspector' ? (
            <div className="space-y-3">
              {/* 1. IDs & Identification */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5 font-mono text-[11px]">
                <div className="text-xs font-bold text-rose-400 font-sans uppercase mb-1">
                  1. Aktive Entitäten & Zuordnung
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">characterId:</span>
                  <span className="text-amber-300 font-semibold">{activeCharacter?.id || '—'} ({charName})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">chatId:</span>
                  <span className="text-zinc-200 font-semibold">{activeChat?.id || '—'} ({activeChat?.title})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">language:</span>
                  <span className="text-emerald-400 font-semibold uppercase">{activeChat?.language || 'de'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">selected greeting source:</span>
                  <span className="text-indigo-300">{firstMesSource}</span>
                </div>
              </div>

              {/* 2. first_mes & alternate_greetings */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 uppercase">2. first_mes (Eröffnungsnachricht)</span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                    Quelle: {firstMesSource}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-950 p-2.5 font-sans text-xs italic text-zinc-200 border border-zinc-800/80 whitespace-pre-wrap">
                  {resolvedFirstMes}
                </div>

                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-zinc-400">
                    alternate_greetings ({alternateGreetings.length} vorhanden):
                  </span>
                  {alternateGreetings.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic mt-0.5">Keine alternate_greetings in dieser Card hinterlegt.</p>
                  ) : (
                    <div className="space-y-1 mt-1">
                      {alternateGreetings.map((ag, idx) => (
                        <div key={idx} className="rounded bg-zinc-950/80 p-2 text-[11px] border border-zinc-800/60 text-zinc-300">
                          <span className="text-rose-400 font-mono text-[10px]">#{idx + 1}: </span>
                          {ag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Scenario & Persona */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
                <div className="text-xs font-bold text-rose-400 uppercase mb-1">3. scenario & Kontext</div>
                <div className="rounded-lg bg-zinc-950 p-2 text-xs text-zinc-200 border border-zinc-800/80">
                  {scenario}
                </div>
              </div>

              {/* 4. System Prompt & Post-History */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <div className="text-xs font-bold text-rose-400 uppercase">4. System Prompt & Post-History</div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">system_prompt:</div>
                  <pre className="mt-0.5 rounded bg-zinc-950 p-2 text-[11px] font-mono text-zinc-300 border border-zinc-800 whitespace-pre-wrap">
                    {systemPrompt}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">post_history_instructions:</div>
                  <pre className="mt-0.5 rounded bg-zinc-950 p-2 text-[11px] font-mono text-zinc-300 border border-zinc-800 whitespace-pre-wrap">
                    {postHistory}
                  </pre>
                </div>
              </div>

              {/* 5. Character Book & Example Dialogue */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <div className="text-xs font-bold text-rose-400 uppercase">5. Character Book & Example Dialogue (mes_example)</div>
                <div className="text-[11px] text-zinc-400">
                  Character Book Einträge: <span className="text-zinc-200 font-semibold">{characterBook?.entries?.length || 0}</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Aktiviert: <span className="text-zinc-200 font-semibold">{backendInspection?.activatedCharacterBookEntries?.length || 0}</span>
                </div>
                {(backendInspection?.activatedCharacterBookEntries || []).map((entry: any, index: number) => (
                  <pre key={entry.id ?? index} className="rounded bg-zinc-950 p-2 text-[11px] text-zinc-300 border border-zinc-800 whitespace-pre-wrap">
                    [{entry.position || 'after_char'} / {entry.insertion_order}] {entry.content}
                  </pre>
                ))}
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-mono">mes_example:</div>
                  <pre className="mt-0.5 rounded bg-zinc-950 p-2 text-[11px] font-mono text-zinc-300 border border-zinc-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {exampleDialogue}
                  </pre>
                </div>
              </div>

              {/* 6. Chat History Isolation & Current Message */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5 font-mono text-[11px]">
                <div className="text-xs font-bold text-rose-400 font-sans uppercase mb-1">
                  6. Chat History Isolation & OpenRouter Payload
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Nachrichten im aktuellen Chat:</span>
                  <span className="text-emerald-400 font-semibold">{messagesCount} (Isoliert für {activeChat?.id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Letzte User-Nachricht:</span>
                  <span className="text-zinc-200 truncate max-w-[280px]">
                    {lastUserMsg ? lastUserMsg.content : '(Noch keine User-Eingabe)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Model:</span>
                  <span className="text-amber-300">{settings?.modelName || serverStatus?.chatModel || 'Default Model'}</span>
                </div>
              </div>

              {/* 7. Tatsächlicher OpenRouter messages[] Payload */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 font-sans uppercase">
                    7. Tatsächlich gesendetes messages[]-Array
                  </span>
                  {isLoadingBackend && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Lade Payload...
                    </span>
                  )}
                </div>

                {backendInspection?.finalMessages ? (
                  <div className="space-y-2 pt-1">
                    {backendInspection.finalMessages.map((msg: any, idx: number) => (
                      <div
                        key={idx}
                        className={`rounded-lg border p-2.5 space-y-1 ${
                          msg.role === 'system'
                            ? 'border-indigo-900/60 bg-indigo-950/20'
                            : msg.role === 'assistant'
                            ? 'border-rose-900/60 bg-rose-950/20'
                            : 'border-emerald-900/60 bg-emerald-950/20'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1">
                          <span
                            className={`font-bold uppercase ${
                              msg.role === 'system'
                                ? 'text-indigo-400'
                                : msg.role === 'assistant'
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            messages[{idx}] ({msg.role})
                          </span>
                          <span className="text-[10px] text-zinc-400">{msg.source || 'OpenRouter Message'}</span>
                        </div>
                        <pre className="font-mono text-[10.5px] text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                          {msg.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 italic text-[11px]">Konnte Payload nicht vom Server laden.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                    <span>Chat Modell:</span>
                    <span className="text-amber-300 font-mono">{serverStatus?.chatModel || 'nvidia/nemotron-3-super-120b-a12b:free'}</span>
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
          )}
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
