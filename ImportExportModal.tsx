import React, { useState } from 'react';
import { Download, Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { parseChatText } from '../utils/chatParser';
import { exportFullRPState, importFullRPState } from '../utils/contextManager';
import { Character, ChatSession, ModelSettings, Message } from '../types';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  activeChat: ChatSession;
  allCharacters: Character[];
  allChats: ChatSession[];
  settings: ModelSettings;
  onImportMessagesToChat: (newMessages: Message[], overwrite?: boolean) => void;
  onRestoreFullBackup: (data: { characters?: Character[]; chats?: ChatSession[]; settings?: ModelSettings }) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  character,
  activeChat,
  allCharacters,
  allChats,
  settings,
  onImportMessagesToChat,
  onRestoreFullBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'json'>('text');
  const [rawText, setRawText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleParseAndImportText = (append: boolean) => {
    if (!rawText.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte füge zuerst Chat-Text ein.' });
      return;
    }

    try {
      const parsed = parseChatText(rawText);
      if (parsed.length === 0) {
        setStatusMessage({
          type: 'error',
          text: `Keine Nachrichten erkannt. Stelle sicher, dass die Zeilen mit "${character.name}:" oder "${character.playerAddressName || 'Lidii'}:" beginnen.`,
        });
        return;
      }

      onImportMessagesToChat(parsed, !append);
      setStatusMessage({
        type: 'success',
        text: `${parsed.length} Nachrichten erfolgreich ${append ? 'angehängt' : 'in diesen Chat geladen'}!`,
      });
      setRawText('');
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1200);
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Fehler beim Parsen des Texts.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.json')) {
        try {
          const state = importFullRPState(content);
          if (state.characters && state.chats) {
            onRestoreFullBackup({
              characters: state.characters,
              chats: state.chats,
              settings: state.settings,
            });
            setStatusMessage({
              type: 'success',
              text: 'Vollständiges Multi-Charakter Backup erfolgreich wiederhergestellt!',
            });
          } else if (state.legacyMessages) {
            onImportMessagesToChat(state.legacyMessages, true);
            setStatusMessage({
              type: 'success',
              text: 'Legacy Chat-Nachrichten erfolgreich in diesen Chat importiert!',
            });
          }
          setTimeout(() => {
            onClose();
            setStatusMessage(null);
          }, 1200);
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Ungültiges JSON-Backup.' });
        }
      } else {
        setRawText(content);
        setActiveTab('text');
      }
    };
    reader.readAsText(file);
  };

  const handleExportJSON = () => {
    const jsonStr = exportFullRPState(allCharacters, allChats, settings);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rp_app_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'success', text: 'Backup aller Charaktere und Chats heruntergeladen!' });
  };

  return (
    <div
      id="import-export-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Import & Export ({character.name} – {activeChat.title})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            title="Schliessen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-4 pt-2">
          <button
            onClick={() => {
              setActiveTab('text');
              setStatusMessage(null);
            }}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'text'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Text-Import in aktuellen Chat
          </button>
          <button
            onClick={() => {
              setActiveTab('json');
              setStatusMessage(null);
            }}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'json'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Vollständiges JSON-Backup
          </button>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div
            className={`mx-4 mt-3 flex items-center gap-2 rounded-lg p-2.5 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed text-zinc-300">
          {activeTab === 'text' ? (
            <div className="space-y-3">
              <p className="text-zinc-400">
                Füge hier bestehende RP-Texte ein. Die Rollen <strong>„{character.name}“</strong> und{' '}
                <strong>„{character.playerAddressName || 'Lidii'}“</strong> werden automatisch erkannt.
              </p>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Beispiel:\n${character.name}: Ich stand im Schatten der Gasse...\n\n${character.playerAddressName || 'Lidii'}: Mein Atem ging flach...`}
                className="min-h-[160px] w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                rows={7}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300 hover:bg-zinc-800">
                  <Upload className="h-3.5 w-3.5" />
                  <span>.txt Datei hochladen</span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleParseAndImportText(true)}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-medium text-zinc-200 hover:bg-zinc-800"
                  >
                    Anhängen
                  </button>
                  <button
                    onClick={() => handleParseAndImportText(false)}
                    className="rounded-lg bg-rose-600 px-3.5 py-2 font-semibold text-white hover:bg-rose-500"
                  >
                    Chat ersetzen
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                <h4 className="mb-1 font-semibold text-zinc-200">
                  Vollständiges Backup aller Charaktere & Chats exportieren
                </h4>
                <p className="mb-3 text-[11px] text-zinc-400">
                  Sichert alle Charaktere ({allCharacters.length}), alle Chats ({allChats.length}) inklusive Gedächtnis und Einstellungen in einer einzigen JSON-Datei.
                </p>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 font-semibold text-zinc-900 hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  <span>Backup jetzt herunterladen</span>
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                <h4 className="mb-1 font-semibold text-zinc-200">
                  JSON-Backup wiederherstellen
                </h4>
                <p className="mb-3 text-[11px] text-zinc-400">
                  Lade ein zuvor gespeichertes Backup hoch, um alle Daten exakt wiederherzustellen.
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 font-medium text-zinc-200 hover:bg-zinc-800">
                  <Upload className="h-4 w-4" />
                  <span>Backup-Datei (.json) auswählen</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
