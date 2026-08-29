import React, { useEffect, useState } from 'react';
import { Check, Cpu, MessageSquareText, RotateCcw, Settings, Sliders, Sparkles, X } from 'lucide-react';
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
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-950/30 text-rose-400"><Settings className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">KI & Prompting</p>
              <h2 className="text-base font-black text-white">Generierung</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-400"><X className="h-5 w-5" /></button>
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm text-zinc-300">
          <Section icon={<Cpu className="h-4 w-4" />} title="OpenRouter" subtitle="Aktuelle kostenlose Standardmodelle bleiben aktiv.">
            <Field label="Modell-Override" hint="Leer lassen = Chat und Imitate Me verwenden weiterhin ihre kostenlosen Standardmodelle.">
              <input value={localSettings.modelName} onChange={e => setLocalSettings({ ...localSettings, modelName: e.target.value })} className="setting-input" placeholder="optional: provider/model" />
            </Field>
          </Section>

          <Section icon={<Sliders className="h-4 w-4" />} title="Generation" subtitle="Modellparameter wie in einer Chub-Konfiguration; nicht Teil der Character Card.">
            <RangeField label="Temperatur" value={localSettings.temperature} min={0} max={1.5} step={0.02} display={localSettings.temperature.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, temperature: value })} />
            <RangeField label="Top P" value={localSettings.topP} min={0.1} max={1} step={0.01} display={localSettings.topP.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, topP: value })} />
            <RangeField label="Max. Antwort" value={localSettings.maxOutputTokens} min={256} max={8192} step={128} display={`${localSettings.maxOutputTokens} Tokens`} onChange={value => setLocalSettings({ ...localSettings, maxOutputTokens: Math.round(value) })} />
            <RangeField label="Kontext" value={localSettings.contextSizeTokens} min={4096} max={131072} step={4096} display={`${Math.round(localSettings.contextSizeTokens / 1024)}k Tokens`} onChange={value => setLocalSettings({ ...localSettings, contextSizeTokens: Math.round(value) })} />

            <details className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <summary className="cursor-pointer text-xs font-black text-zinc-300">Weitere Sampling-Parameter</summary>
              <div className="mt-4 space-y-4">
                <RangeField label="Frequency Penalty" value={localSettings.frequencyPenalty} min={-2} max={2} step={0.05} display={localSettings.frequencyPenalty.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, frequencyPenalty: value })} />
                <RangeField label="Presence Penalty" value={localSettings.presencePenalty} min={-2} max={2} step={0.05} display={localSettings.presencePenalty.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, presencePenalty: value })} />
                <RangeField label="Repetition Penalty" value={localSettings.repetitionPenalty} min={0.5} max={1.5} step={0.01} display={localSettings.repetitionPenalty.toFixed(2)} onChange={value => setLocalSettings({ ...localSettings, repetitionPenalty: value })} />
              </div>
            </details>
          </Section>

          <Section icon={<MessageSquareText className="h-4 w-4" />} title="Prompt-Struktur" subtitle="Chub-nahe optionale Prompt Note und Assistant Prefill.">
            <Field label="Prompt Note" hint="Wird an der gewählten Tiefe in die Chat History eingefügt. Makros wie {{char}}, {{user}}, {{profile}}, {{summary}} und {{memory}} sind möglich.">
              <textarea rows={5} value={localSettings.promptNote} onChange={e => setLocalSettings({ ...localSettings, promptNote: e.target.value })} className="setting-input font-mono text-xs" placeholder="Optional …" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tiefe"><input type="number" min={0} max={100} value={localSettings.promptNoteDepth} onChange={e => setLocalSettings({ ...localSettings, promptNoteDepth: Math.max(0, Number(e.target.value) || 0) })} className="setting-input" /></Field>
              <Field label="Rolle">
                <select value={localSettings.promptNoteRole} onChange={e => setLocalSettings({ ...localSettings, promptNoteRole: e.target.value as PromptRole })} className="setting-input">
                  {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Assistant Prefill" hint="Optionaler Anfang der nächsten Assistant-Antwort. Leer lassen, wenn die Card das nicht braucht.">
              <textarea rows={3} value={localSettings.assistantPrefill} onChange={e => setLocalSettings({ ...localSettings, assistantPrefill: e.target.value })} className="setting-input font-mono text-xs" placeholder="Optional …" />
            </Field>
          </Section>

          <Section icon={<Sparkles className="h-4 w-4" />} title="Imitate Me" subtitle="Eigener Impersonation Prompt statt fest verdrahteter Spieler-Persönlichkeit.">
            <Field label="Impersonation Prompt" hint="Steuert nur Imitate Me. {{char}}, {{user}}, {{profile}}, {{summary}}, {{scenario}} und {{memory}} werden aufgelöst.">
              <textarea rows={8} value={localSettings.impersonationPrompt} onChange={e => setLocalSettings({ ...localSettings, impersonationPrompt: e.target.value })} className="setting-input font-mono text-xs" />
            </Field>
          </Section>

          <section className="rounded-2xl border border-rose-900/25 bg-rose-950/10 p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-rose-200">App auf Standarddaten zurücksetzen</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Setzt Charaktere und Chats auf die mitgelieferten Standarddaten zurück. Modell- und Prompt-Einstellungen bleiben separat gespeichert.</p>
                {showResetConfirm ? (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setShowResetConfirm(false)} className="rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-400">Abbrechen</button>
                    <button onClick={() => { onResetToCanon(); setShowResetConfirm(false); onClose(); }} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white">Zurücksetzen</button>
                  </div>
                ) : (
                  <button onClick={() => setShowResetConfirm(true)} className="mt-3 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-rose-300">Standarddaten wiederherstellen</button>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="flex items-center justify-between border-t border-zinc-900 px-5 py-4">
          <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-zinc-500">Schliessen</button>
          <button onClick={handleSave} className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white">
            {saveFeedback ? <Check className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
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

const Section: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }> = ({ icon, title, subtitle, children }) => (
  <section className="rounded-[22px] border border-zinc-800 bg-zinc-950/65 p-4">
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-rose-400">{icon}</span>
      <div><p className="text-sm font-black text-zinc-100">{title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">{subtitle}</p></div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-2">
    <span className="text-xs font-bold text-zinc-300">{label}</span>
    {children}
    {hint && <span className="block text-[10px] leading-relaxed text-zinc-600">{hint}</span>}
  </label>
);

const RangeField: React.FC<{ label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }> = ({ label, value, min, max, step, display, onChange }) => (
  <label className="block">
    <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-bold text-zinc-300">{label}</span><span className="font-mono text-[11px] text-rose-300">{display}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-rose-500" />
  </label>
);
