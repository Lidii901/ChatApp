import React, { useState } from 'react';
import { Download, Upload, FileText, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';
import { parseChatText } from '../utils/chatParser';
import { exportFullRPState, importFullRPState } from '../utils/contextManager';
import { characterToV2Card, v2CardToCharacter, isValidV2Card } from '../utils/characterCardV2Converter';
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
  onImportCharacterCard?: (character: Character) => void;
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
  onImportCharacterCard,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'json' | 'card'>('text');
  const [rawText, setRawText] = useState('');
  const [cardJsonText, setCardJsonText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleParseAndImportText = (append: boolean) => {
    if (!rawText.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte füge zuerst Chat-Text ein.' });
      return;
    }

    try {
      const parsed = parseChatText(rawText, character.name, character.playerAddressName || 'Lidii');
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
          const parsed = JSON.parse(content);
          // Check if it's a Character Card V2 JSON
          if (isValidV2Card(parsed)) {
            const importedChar = v2CardToCharacter(parsed);
            if (onImportCharacterCard) {
              onImportCharacterCard(importedChar);
              setStatusMessage({
                type: 'success',
                text: `Character Card V2 „${importedChar.name}“ erfolgreich importiert!`,
              });
              setTimeout(() => {
                onClose();
                setStatusMessage(null);
              }, 1200);
              return;
            }
          }

          const state = importFullRPState(content);
          if (state.characters && state.chats) {
            // A full restore replaces the app state. Close this modal before handing
            // the restored state to the parent so stale modal UI cannot survive the
            // character/chat replacement or block the restored navigation.
            onClose();
            setStatusMessage(null);
            onRestoreFullBackup({
              characters: state.characters,
              chats: state.chats,
              settings: state.settings,
            });
            return;
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

  const handleExportCharacterCardV2 = () => {
    const v2Card = characterToV2Card(character);
    const jsonStr = JSON.stringify(v2Card, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (character.name || 'character').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `${safeName}_card_v2.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'success', text: `Character Card V2 für „${character.name}“ heruntergeladen!` });
  };

  const handleImportCardFromText = () => {
    if (!cardJsonText.trim()) {
      setStatusMessage({ type: 'error', text: 'Bitte füge das JSON einer Character Card V2 ein.' });
      return;
    }
    try {
      const parsed = JSON.parse(cardJsonText);
      if (!isValidV2Card(parsed)) {
        setStatusMessage({ type: 'error', text: 'Ungültiges Format: Keine Character Card V2 Spezifikation erkannt (spec must be "chara_card_v2").' });
        return;
      }
      const importedChar = v2CardToCharacter(parsed);
      if (onImportCharacterCard) {
        onImportCharacterCard(importedChar);
        setStatusMessage({
          type: 'success',
          text: `Character Card V2 „${importedChar.name}“ erfolgreich importiert!`,
        });
        setCardJsonText('');
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 1200);
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Fehler beim Parsen der Character Card.' });
    }
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
            Text-Import
          </button>
          <button
            onClick={() => {
              setActiveTab('card');
              setStatusMessage(null);
            }}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'card'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Character Card V2 (Chub)
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
            Vollständiges Backup
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
          {activeTab === 'text' && (
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
          )}

          {activeTab === 'card' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                <h4 className="mb-1 font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-rose-400" />
                  Character Card V2 exportieren
                </h4>
                <p className="mb-3 text-[11px] text-zinc-400">
                  Exportiert <strong>{character.name}</strong> im universellen Character Card V2 JSON-Standard (kompatibel mit Chub AI, SillyTavern, Jan, Agnaistic).
                </p>
                <button
                  onClick={handleExportCharacterCardV2}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-500"
                >
                  <Download className="h-4 w-4" />
                  <span>Character Card V2 herunterladen (.json)</span>
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2.5">
                <h4 className="font-semibold text-zinc-200">
                  Character Card V2 importieren
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Importiere eine Charakterkarte aus Chub AI oder SillyTavern per Datei oder JSON-Text.
                </p>

                <textarea
                  value={cardJsonText}
                  onChange={(e) => setCardJsonText(e.target.value)}
                  placeholder="JSON-Inhalt der Character Card V2 hier einfügen..."
                  className="min-h-[100px] w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-[11px] font-mono text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  rows={4}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-medium text-zinc-200 hover:bg-zinc-800">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Card-Datei (.json) auswählen</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleImportCardFromText}
                    className="rounded-lg bg-zinc-100 px-3.5 py-2 font-semibold text-zinc-900 hover:bg-white"
                  >
                    Karte importieren
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
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
