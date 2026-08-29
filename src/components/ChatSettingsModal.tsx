import React, { useEffect, useState } from 'react';
import { Character, ChatLanguage, ChatSession, ChatCharacterSettings, PromptRole } from '../types';
import { Globe2, RotateCcw, Save, Settings2, X } from 'lucide-react';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatSession | null;
  baseCharacter: Character;
  onSaveChat: (updatedChat: ChatSession) => void;
}

function definitionValue(character: Character, key: 'description' | 'scenario' | 'mesExample'): string {
  if (key === 'description') return character.description !== undefined ? character.description : character.appearance || '';
  if (key === 'scenario') return character.scenario !== undefined ? character.scenario : character.startPlot || '';
  return character.mesExample !== undefined ? character.mesExample : character.exampleDialogues || '';
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ isOpen, onClose, chat, baseCharacter, onSaveChat }) => {
  const [language, setLanguage] = useState<ChatLanguage>('de');
  const [currentScene, setCurrentScene] = useState('');
  const [sceneSummary, setSceneSummary] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');
  const [scenario, setScenario] = useState('');
  const [mesExample, setMesExample] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [postHistoryInstructions, setPostHistoryInstructions] = useState('');
  const [characterNote, setCharacterNote] = useState('');
  const [characterNoteDepth, setCharacterNoteDepth] = useState(4);
  const [characterNoteRole, setCharacterNoteRole] = useState<PromptRole>('system');
  const [loreScanDepthOverride, setLoreScanDepthOverride] = useState<string>('');
  const [loreTokenBudgetOverride, setLoreTokenBudgetOverride] = useState<string>('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !chat) return;
    const overrides = chat.characterSettings || {};
    setLanguage(chat.language);
    setCurrentScene(chat.storyContext.currentScene || '');
    setSceneSummary(chat.storyContext.sceneSummary || '');
    setDescription(overrides.description ?? definitionValue(baseCharacter, 'description'));
    setPersonality(overrides.personality ?? baseCharacter.personality ?? '');
    setScenario(overrides.scenario ?? definitionValue(baseCharacter, 'scenario'));
    setMesExample(overrides.mesExample ?? definitionValue(baseCharacter, 'mesExample'));
    setSystemPrompt(overrides.systemPrompt ?? baseCharacter.systemPrompt ?? '');
    setPostHistoryInstructions(overrides.postHistoryInstructions ?? baseCharacter.postHistoryInstructions ?? '');
    setCharacterNote(overrides.characterNote ?? baseCharacter.characterNote ?? '');
    setCharacterNoteDepth(overrides.characterNoteDepth ?? baseCharacter.characterNoteDepth ?? 4);
    setCharacterNoteRole(overrides.characterNoteRole ?? baseCharacter.characterNoteRole ?? 'system');
    setLoreScanDepthOverride(overrides.loreScanDepthOverride === undefined ? '' : String(overrides.loreScanDepthOverride));
    setLoreTokenBudgetOverride(overrides.loreTokenBudgetOverride === undefined ? '' : String(overrides.loreTokenBudgetOverride));
    setSaved(false);
  }, [isOpen, chat, baseCharacter]);

  if (!isOpen || !chat) return null;

  const resetPromptOverrides = () => {
    setDescription(definitionValue(baseCharacter, 'description'));
    setPersonality(baseCharacter.personality || '');
    setScenario(definitionValue(baseCharacter, 'scenario'));
    setMesExample(definitionValue(baseCharacter, 'mesExample'));
    setSystemPrompt(baseCharacter.systemPrompt || '');
    setPostHistoryInstructions(baseCharacter.postHistoryInstructions || '');
    setCharacterNote(baseCharacter.characterNote || '');
    setCharacterNoteDepth(baseCharacter.characterNoteDepth ?? 4);
    setCharacterNoteRole(baseCharacter.characterNoteRole || 'system');
    setLoreScanDepthOverride('');
    setLoreTokenBudgetOverride('');
  };

  const handleSave = () => {
    const characterSettings: ChatCharacterSettings = {
      description,
      personality,
      scenario,
      mesExample,
      systemPrompt,
      postHistoryInstructions,
      characterNote,
      characterNoteDepth,
      characterNoteRole,
      ...(loreScanDepthOverride === '' ? {} : { loreScanDepthOverride: Math.max(0, Number(loreScanDepthOverride) || 0) }),
      ...(loreTokenBudgetOverride === '' ? {} : { loreTokenBudgetOverride: Math.max(0, Number(loreTokenBudgetOverride) || 0) }),
    };

    onSaveChat({
      ...chat,
      language,
      characterSettings,
      storyContext: {
        ...chat.storyContext,
        currentScene: currentScene.trim(),
        sceneSummary: sceneSummary.trim(),
      },
      updatedAt: Date.now(),
    });
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[30px] border border-zinc-800 bg-[#0b0b0d] shadow-2xl sm:max-w-2xl sm:rounded-[28px]" onClick={event => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-950/30 text-rose-400"><Settings2 className="h-5 w-5" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">Nur dieser Chat</p><h2 className="text-base font-black text-white">Chat Settings</h2></div>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-400"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm text-zinc-300">
          <Field label="Sprache">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-900 p-1.5">
              {(['de', 'en'] as const).map(value => (
                <button key={value} onClick={() => setLanguage(value)} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black ${language === value ? 'bg-rose-600 text-white' : 'text-zinc-500'}`}><Globe2 className="h-3.5 w-3.5" /> {value.toUpperCase()}</button>
              ))}
            </div>
          </Field>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs font-black text-white">Chat Memory</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">Ältere Entwicklung bleibt hier erhalten; aktuelle Nachrichten bleiben direkt im tokenbasierten Chat-Kontext.</p>
            <div className="mt-4 space-y-4">
              <Field label="Aktuelle Szene"><textarea className="input" rows={3} value={currentScene} onChange={e => setCurrentScene(e.target.value)} /></Field>
              <Field label="Chat-Memory-Zusammenfassung"><textarea className="input" rows={5} value={sceneSummary} onChange={e => setSceneSummary(e.target.value)} /></Field>
            </div>
          </section>

          <section className="rounded-2xl border border-rose-900/25 bg-rose-950/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black text-rose-200">Character Override</p><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Diese Felder ersetzen nur in diesem Chat die wirksamen Character-/Promptfelder.</p></div>
              <button onClick={resetPromptOverrides} className="flex shrink-0 items-center gap-1 rounded-xl bg-zinc-900 px-2.5 py-2 text-[10px] font-bold text-zinc-400"><RotateCcw className="h-3.5 w-3.5" /> Basis</button>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Description"><textarea className="input" rows={6} value={description} onChange={e => setDescription(e.target.value)} /></Field>
              <Field label="Personality"><textarea className="input" rows={4} value={personality} onChange={e => setPersonality(e.target.value)} /></Field>
              <Field label="Scenario"><textarea className="input" rows={4} value={scenario} onChange={e => setScenario(e.target.value)} /></Field>
              <Field label="Example Dialogues"><textarea className="input font-mono text-xs" rows={5} value={mesExample} onChange={e => setMesExample(e.target.value)} /></Field>
              <Field label="System Prompt"><textarea className="input font-mono text-xs" rows={5} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} /></Field>
              <Field label="Post History Instructions"><textarea className="input font-mono text-xs" rows={5} value={postHistoryInstructions} onChange={e => setPostHistoryInstructions(e.target.value)} /></Field>
              <Field label="Character's Note"><textarea className="input font-mono text-xs" rows={4} value={characterNote} onChange={e => setCharacterNote(e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Note Depth"><input type="number" min={0} value={characterNoteDepth} onChange={e => setCharacterNoteDepth(Math.max(0, Number(e.target.value) || 0))} className="input" /></Field>
                <Field label="Note Role"><select value={characterNoteRole} onChange={e => setCharacterNoteRole(e.target.value as PromptRole)} className="input"><option value="system">System</option><option value="user">User</option><option value="assistant">Assistant</option></select></Field>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs font-black text-white">Lorebook Overrides</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">Leer = Werte des Character Books verwenden.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Scan depth"><input type="number" min={0} value={loreScanDepthOverride} onChange={e => setLoreScanDepthOverride(e.target.value)} className="input" placeholder="Card" /></Field>
              <Field label="Token budget"><input type="number" min={0} value={loreTokenBudgetOverride} onChange={e => setLoreTokenBudgetOverride(e.target.value)} className="input" placeholder="Card" /></Field>
            </div>
          </section>
        </div>

        <footer className="flex justify-end border-t border-zinc-900 px-5 py-4">
          <button onClick={handleSave} className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"><Save className="h-4 w-4" /> {saved ? 'Gespeichert' : 'Übernehmen'}</button>
        </footer>

        <style>{`
          .input { width: 100%; border: 1px solid rgb(39 39 42); border-radius: 0.9rem; background: rgb(24 24 27 / .78); padding: .7rem .85rem; color: rgb(244 244 245); outline: none; }
          .input:focus { border-color: rgb(244 63 94 / .65); }
        `}</style>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-2"><span className="text-xs font-bold text-zinc-300">{label}</span>{children}</label>
);
