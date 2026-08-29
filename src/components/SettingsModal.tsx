import React, { useEffect, useState } from 'react';
import { Brain, Check, ChevronDown, RotateCcw, Save, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { ModelSettings, PromptRole } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ModelSettings;
  onSaveSettings: (settings: ModelSettings) => void;
  onResetToCanon: () => void;
}

const roleOptions: Array<{ value: PromptRole; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'user', label: 'User' },
  { value: 'assistant', label: 'Assistant' },
];

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

  useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] border border-zinc-800 bg-[#0b0b0d] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-[28px]">
        <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-950/30 text-rose-400"><Brain className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400">Chat-Erlebnis</p>
              <h2 className="text-base font-black text-white">KI & Antworten</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-400"><X className="h-5 w-5" /></button>
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm text-zinc-300">
          <section className="rounded-[22px] border border-zinc-800 bg-zinc-950/65 p-4">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-rose-400"><Sparkles className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-black text-zinc-100">Antwortverhalten</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">Die Character Card bleibt die wichtigste Grundlage. Hier stellst du nur ein, wie frei und wie lang das Modell antwortet.</p>
              </div>
            </div>

            <div className="space-y-5">
              <RangeField
                label="Kreativität"
                hint="Niedriger = ruhiger und vorhersehbarer. Höher = freier und variabler."
                value={localSettings.temperature}
                min={0}
                max={1.5}
                step={0.02}
                display={localSettings.temperature.toFixed(2)}
                onChange={value => setLocalSettings({ ...localSettings, temperature: value })}
              />
              <RangeField
                label="Antwortlänge"
                hint="Legt die maximale Länge einer einzelnen Antwort fest."
                value={localSettings.maxOutputTokens}
                min={256}
                max={8192}
                step={128}
                display={`${localSettings.maxOutputTokens} Tokens`}
                onChange={value => setLocalSettings({ ...localSettings, maxOutputTokens: Math.round(value) })}
              />
              <RangeField
                label="Erinnerungsspanne"
                hint="Wie viel vom direkten Chatverlauf in den aktuellen Modellkontext passt. Ältere relevante Ereignisse können zusätzlich im Chat Memory bleiben."
                value={localSettings.contextSizeTokens}
                min={4096}
                max={131072}
                step={4096}
                display={`${Math.round(localSettings.contextSizeTokens / 1024)}k Tokens`}
                onChange={value => setLocalSettings({ ...localSettings, contextSizeTokens: Math.round(value) })}
              />
            </div>
          </section>

          <details className="group rounded-[22px] border border-zinc-800 bg-zinc-950/65">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400"><SlidersHorizontal className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-zinc-100">Erweiterte Einstellungen</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-600">Für Chub-Prompting, Sampling und Imitate Me. Normalerweise musst du hier nichts ändern.</span>
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-600 transition-transform group-open:rotate-180" />
            </summary>

            <div className="space-y-5 border-t border-zinc-900 px-4 py-4">
              <Field label="Modell-Override" hint="Leer lassen = die kostenlosen Standardmodelle der App bleiben aktiv.">
                <input value={localSettings.modelName} onChange={e => setLocalSettings({ ...localSettings, modelName: e.target.value })} className="setting-input" placeholder="Optional" />
              </Field>

              <RangeField label="Top P" value={localSettings.topP} min={0.1} max={1} step={0.01} display={localSettings.topP.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, topP: value })} />
              <RangeField label="Frequency Penalty" value={localSettings.frequencyPenalty} min={-2} max={2} step={0.05} display={localSettings.frequencyPenalty.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, frequencyPenalty: value })} />
              <RangeField label="Presence Penalty" value={localSettings.presencePenalty} min={-2} max={2} step={0.05} display={localSettings.presencePenalty.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, presencePenalty: value })} />
              <RangeField label="Repetition Penalty" value={localSettings.repetitionPenalty} min={0.5} max={1.5} step={0.01} display={localSettings.repetitionPenalty.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, repetitionPenalty: value })} />

              <Field label="Prompt Note" hint="Optional. Wird an der gewählten Position in die Chat History eingefügt. Chub-Makros werden unterstützt.">
                <textarea rows={5} value={localSettings.promptNote} onChange={e => setLocalSettings({ ...localSettings, promptNote: e.target.value })} className="setting-input font-mono text-xs" placeholder="Optional …" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prompt-Tiefe"><input type="number" min={0} max={100} value={localSettings.promptNoteDepth} onChange={e => setLocalSettings({ ...localSettings, promptNoteDepth: Math.max(0, Number(e.target.value) || 0) })} className="setting-input" /></Field>
                <Field label="Prompt-Rolle">
                  <select value={localSettings.promptNoteRole} onChange={e => setLocalSettings({ ...localSettings, promptNoteRole: e.target.value as PromptRole })} className="setting-input">
                    {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Assistant Prefill" hint="Optionaler Anfang einer Charakterantwort. Leer lassen, wenn die Card keinen Prefill braucht.">
                <textarea rows={3} value={localSettings.assistantPrefill} onChange={e => setLocalSettings({ ...localSettings, assistantPrefill: e.target.value })} className="setting-input font-mono text-xs" placeholder="Optional …" />
              </Field>
              <Field label="Imitate-Me-Prompt" hint="Steuert nur die Entwürfe für deine Spielerfigur. Die Wissensgrenzen der aktuellen Story bleiben zusätzlich geschützt.">
                <textarea rows={7} value={localSettings.impersonationPrompt} onChange={e => setLocalSettings({ ...localSettings, impersonationPrompt: e.target.value })} className="setting-input font-mono text-xs" />
              </Field>
            </div>
          </details>

          <section className="rounded-[22px] border border-rose-900/25 bg-rose-950/10 p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-rose-200">App-Inhalte zurücksetzen</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Stellt die mitgelieferten Charaktere und Chats wieder her. Deine KI-Einstellungen werden dabei nicht zurückgesetzt.</p>
                {showResetConfirm ? (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setShowResetConfirm(false)} className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-400">Abbrechen</button>
                    <button onClick={() => { onResetToCanon(); setShowResetConfirm(false); onClose(); }} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white">Wirklich zurücksetzen</button>
                  </div>
                ) : (
                  <button onClick={() => setShowResetConfirm(true)} className="mt-3 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-rose-300">Standardinhalte wiederherstellen</button>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="flex items-center justify-between border-t border-zinc-900 px-5 py-4">
          <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-zinc-500">Abbrechen</button>
          <button onClick={handleSave} className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white">
            {saveFeedback ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saveFeedback ? 'Gespeichert' : 'Speichern'}
          </button>
        </footer>

        <style>{`
          .setting-input { width:100%; border:1px solid rgb(39 39 42); border-radius:.9rem; background:rgb(24 24 27 / .78); padding:.75rem .85rem; color:rgb(244 244 245); outline:none; }
          .setting-input:focus { border-color:rgb(244 63 94 / .65); }
        `}</style>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-2">
    <span className="text-xs font-bold text-zinc-300">{label}</span>
    {children}
    {hint && <span className="block text-[10px] leading-relaxed text-zinc-600">{hint}</span>}
  </label>
);

const RangeField: React.FC<{ label: string; value: number; min: number; max: number; step: number; display: string; hint?: string; onChange: (value: number) => void }> = ({ label, value, min, max, step, display, hint, onChange }) => (
  <label className="block">
    <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-bold text-zinc-300">{label}</span><span className="font-mono text-[11px] text-rose-300">{display}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-rose-500" />
    {hint && <span className="mt-1.5 block text-[10px] leading-relaxed text-zinc-600">{hint}</span>}
  </label>
);
