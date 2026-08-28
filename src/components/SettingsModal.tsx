import React, { useState } from 'react';
import { X, Settings, RotateCcw, Shield, Cpu, Sliders, Check } from 'lucide-react';
import { ModelSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ModelSettings;
  onSaveSettings: (settings: ModelSettings) => void;
  onResetToCanon: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetToCanon,
}) => {
  const [localSettings, setLocalSettings] = useState<ModelSettings>(settings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
    }, 2500);
  };

  return (
    <div
      id="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-300" />
            <h2 className="font-serif text-base font-semibold text-zinc-100">
              Modell & RP-Parameter
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed text-zinc-300">
          {/* Provider Info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-zinc-200">API-Schnittstelle</span>
              <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-800/40">
                OpenRouter
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Verwendet ausschließlich den OpenRouter-Endpunkt mit <code className="text-zinc-300">OPENROUTER_API_KEY</code> und <code className="text-zinc-300">OPENROUTER_MODEL</code> aus den Server-Umgebungsvariablen.
            </p>
          </div>

          {/* Model Name Override */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <label className="mb-1 block font-semibold text-zinc-200">
              Modell-Bezeichnung (Optionaler Override)
            </label>
            <input
              type="text"
              value={localSettings.modelName}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, modelName: e.target.value })
              }
              placeholder="Leer lassen für Standard-Modelle"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              Feste Standardmodelle: Dean Chat (<code className="text-amber-300">nvidia/nemotron-3-super-120b-a12b:free</code>) & Imitate Me (<code className="text-amber-300">nvidia/nemotron-3-ultra-550b-a55b:free</code>)
            </p>
          </div>

          {/* Sliders: Temperature */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Temperatur (Kreativität)</span>
              <span className="font-mono text-amber-400">{localSettings.temperature}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.02"
              value={localSettings.temperature}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  temperature: parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-500"
            />
            <p className="text-[10px] text-zinc-400">
              0.85 – 0.90 empfohlen für facettenreiches, atmosphärisches Rollenspiel.
            </p>
          </div>

          {/* Sliders: Max Output Tokens */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Maximale Antwortlänge</span>
              <span className="font-mono text-amber-400">{localSettings.maxOutputTokens} Tokens</span>
            </div>
            <input
              type="range"
              min="800"
              max="4000"
              step="100"
              value={localSettings.maxOutputTokens}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  maxOutputTokens: parseInt(e.target.value),
                })
              }
              className="w-full accent-amber-500"
            />
            <p className="text-[10px] text-zinc-400">
              Ermöglicht ausführliche, mehrteilige Absätze ohne künstliche Kürzung.
            </p>
          </div>

          {/* Sliders: Context Window Size */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Kontext-Nachrichten (Wortlaut)</span>
              <span className="font-mono text-amber-400">{localSettings.contextWindowSize}</span>
            </div>
            <input
              type="range"
              min="6"
              max="30"
              step="2"
              value={localSettings.contextWindowSize}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  contextWindowSize: parseInt(e.target.value),
                })
              }
              className="w-full accent-amber-500"
            />
            <p className="text-[10px] text-zinc-400">
              Anzahl der letzten vollständigen Nachrichten, die dem Modell übergeben werden.
            </p>
          </div>

          {/* Reset Action */}
          <div className="rounded-xl border border-rose-950/50 bg-rose-950/20 p-3">
            <div className="mb-1 font-semibold text-rose-300">Story zurücksetzen</div>
            <p className="mb-2 text-[11px] text-zinc-400">
              Setzt den Chat auf den Beginn der Gassen-Verfolgung in der Bronx zurück.
            </p>
            {showResetConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    onResetToCanon();
                    setShowResetConfirm(false);
                    onClose();
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Ja, zurücksetzen
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-zinc-900 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-950/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Auf Canon-Startpunkt zurücksetzen</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            Schliessen
          </button>
          <div className="flex items-center gap-3">
            {saveFeedback && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 animate-in fade-in duration-200">
                <Check className="h-3.5 w-3.5" />
                <span>Gespeichert!</span>
              </span>
            )}
            <button
              onClick={handleSave}
              className="rounded-lg bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white active:scale-98 transition-all"
            >
              Einstellungen speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
