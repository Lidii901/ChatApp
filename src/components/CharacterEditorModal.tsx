import React, { useEffect, useRef, useState } from 'react';
import { Character, ImageFrequency } from '../types';
import type { CharacterBook, CharacterBookEntry } from '../types/characterCardV2';
import {
  BookOpen,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';

interface CharacterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  onSave: (character: Character) => void;
}

type Tab = 'info' | 'definition' | 'start' | 'advanced' | 'lore';

const emptyBook = (): CharacterBook => ({
  extensions: {},
  entries: [],
  scan_depth: 4,
  recursive_scanning: false,
});

function legacyDescription(character: Character): string {
  if (character.description !== undefined) return character.description;
  return [
    character.appearance,
    character.background ? `Background:\n${character.background}` : '',
    character.relationshipToPlayer ? `Relationship / prior context with {{user}}:\n${character.relationshipToPlayer}` : '',
  ].filter(Boolean).join('\n\n');
}

function legacyPersonality(character: Character): string {
  if (character.description !== undefined) return character.personality || '';
  return [
    character.personality,
    character.writingStyle ? `Writing style: ${character.writingStyle}` : '',
    character.toneOfVoice ? `Voice: ${character.toneOfVoice}` : '',
    character.typicalPhrases ? `Typical speech examples: ${character.typicalPhrases}` : '',
    character.startBehavior ? `Behavior: ${character.startBehavior}` : '',
  ].filter(Boolean).join('\n');
}

function legacyPostHistory(character: Character): string {
  if (character.postHistoryInstructions !== undefined) return character.postHistoryInstructions;
  return [character.behaviorRules, character.customInstructions].filter(Boolean).join('\n\n');
}

function initialForm(character: Character | null): Partial<Character> {
  if (!character) {
    return {
      id: `char-${Date.now()}`,
      name: '',
      avatarUrl: '',
      age: '',
      playerAddressName: 'User',
      description: '',
      personality: '',
      scenario: '',
      firstMes: '',
      mesExample: '',
      systemPrompt: '',
      postHistoryInstructions: '',
      alternateGreetings: [],
      characterBook: emptyBook(),
      creatorNotes: '',
      tags: [],
      creator: '',
      characterVersion: '1.0',
      imageFrequency: 'occasional',
      imageStyleDescription: '',
    };
  }

  return {
    ...character,
    description: legacyDescription(character),
    personality: legacyPersonality(character),
    scenario: character.scenario !== undefined ? character.scenario : character.startPlot || '',
    firstMes: character.firstMes !== undefined ? character.firstMes : character.startPrompt || '',
    mesExample: character.mesExample !== undefined ? character.mesExample : character.exampleDialogues || '',
    postHistoryInstructions: legacyPostHistory(character),
    alternateGreetings: [...(character.alternateGreetings || [])],
    characterBook: character.characterBook
      ? {
          ...character.characterBook,
          extensions: character.characterBook.extensions || {},
          entries: (character.characterBook.entries || []).map(entry => ({ ...entry, extensions: entry.extensions || {} })),
        }
      : emptyBook(),
  };
}

function createLoreEntry(index: number): CharacterBookEntry {
  return {
    keys: [],
    content: '',
    insertion_order: index,
    extensions: {},
    enabled: true,
    position: 'after_char',
  };
}

export const CharacterEditorModal: React.FC<CharacterEditorModalProps> = ({ isOpen, onClose, character, onSave }) => {
  const [formData, setFormData] = useState<Partial<Character>>(() => initialForm(character));
  const [activeTab, setActiveTab] = useState<Tab>('definition');
  const [newGreeting, setNewGreeting] = useState('');
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(initialForm(character));
    setActiveTab(character ? 'definition' : 'info');
    setNewGreeting('');
    setSaved(false);
  }, [isOpen, character]);

  if (!isOpen) return null;

  const book = formData.characterBook || emptyBook();

  const updateBook = (next: Partial<CharacterBook>) => {
    setFormData(current => ({
      ...current,
      characterBook: { ...(current.characterBook || emptyBook()), ...next },
    }));
  };

  const updateEntry = (index: number, patch: Partial<CharacterBookEntry>) => {
    const entries = [...book.entries];
    entries[index] = { ...entries[index], ...patch };
    updateBook({ entries });
  };

  const removeEntry = (index: number) => {
    const entries = book.entries.filter((_, i) => i !== index).map((entry, i) => ({ ...entry, insertion_order: i }));
    updateBook({ entries });
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setFormData(current => ({ ...current, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const name = formData.name?.trim();
    if (!name) {
      alert('Bitte gib dem Charakter einen Namen.');
      return;
    }

    const description = formData.description ?? '';
    const personality = formData.personality ?? '';
    const scenario = formData.scenario ?? '';
    const firstMes = formData.firstMes ?? '';
    const mesExample = formData.mesExample ?? '';
    const wasLegacy = Boolean(character && character.description === undefined);

    const base: Character = character || {
      id: formData.id || `char-${Date.now()}`,
      name,
      avatarUrl: '',
      age: '',
      appearance: '',
      personality: '',
      background: '',
      relationshipToPlayer: '',
      writingStyle: '',
      toneOfVoice: '',
      typicalPhrases: '',
      playerAddressName: 'User',
      thoughtsEnabled: true,
      initiativeLevel: 'medium',
      flirtBehavior: 'subtle',
      dominanceLevel: 'balanced',
      behaviorRules: '',
      memories: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const finalCharacter: Character = {
      ...base,
      id: formData.id || base.id,
      name,
      avatarUrl: formData.avatarUrl || '',
      age: formData.age || '',
      playerAddressName: formData.playerAddressName?.trim() || 'User',
      description,
      personality,
      scenario,
      firstMes,
      mesExample,
      systemPrompt: formData.systemPrompt ?? '',
      postHistoryInstructions: formData.postHistoryInstructions ?? '',
      alternateGreetings: formData.alternateGreetings || [],
      characterBook: formData.characterBook || emptyBook(),
      creatorNotes: formData.creatorNotes ?? '',
      tags: formData.tags || [],
      creator: formData.creator ?? '',
      characterVersion: formData.characterVersion ?? '1.0',
      appearance: description,
      startPlot: scenario,
      startPrompt: firstMes,
      exampleDialogues: mesExample,
      background: wasLegacy ? '' : base.background,
      relationshipToPlayer: wasLegacy ? '' : base.relationshipToPlayer,
      writingStyle: wasLegacy ? '' : base.writingStyle,
      toneOfVoice: wasLegacy ? '' : base.toneOfVoice,
      typicalPhrases: wasLegacy ? '' : base.typicalPhrases,
      startBehavior: wasLegacy ? '' : base.startBehavior,
      behaviorRules: wasLegacy ? '' : base.behaviorRules,
      customInstructions: wasLegacy ? '' : base.customInstructions,
      imageFrequency: formData.imageFrequency || base.imageFrequency || 'occasional',
      imageStyleDescription: formData.imageStyleDescription ?? base.imageStyleDescription ?? '',
      memories: base.memories || [],
      createdAt: base.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(finalCharacter);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'info', label: 'Info', icon: <User className="h-4 w-4" /> },
    { id: 'definition', label: 'Definition', icon: <FileText className="h-4 w-4" /> },
    { id: 'start', label: 'Start', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Settings2 className="h-4 w-4" /> },
    { id: 'lore', label: 'Lorebook', icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[94vh] w-full flex-col overflow-hidden rounded-t-[30px] border border-zinc-800 bg-[#0b0b0d] shadow-2xl sm:max-w-3xl sm:rounded-[30px]">
        <style>{`
          .field { width: 100%; border: 1px solid rgb(39 39 42); border-radius: .9rem; background: rgb(24 24 27 / .78); padding: .7rem .85rem; color: rgb(244 244 245); outline: none; }
          .field:focus { border-color: rgb(244 63 94 / .65); }
        `}</style>
        <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">Character Card V2</p>
            <h2 className="mt-1 text-lg font-black text-white">{character ? formData.name || 'Charakter bearbeiten' : 'Neuer Charakter'}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-400"><X className="h-5 w-5" /></button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-900 px-3 py-2 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${activeTab === tab.id ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto px-5 py-5 text-sm text-zinc-300">
          {activeTab === 'info' && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/10 p-3 text-xs leading-relaxed text-emerald-200/80">
                Info-Felder sind Metadaten. Creator Notes und Tags werden gespeichert/exportiert, aber gemäss Character Card V2 nicht in den KI-Prompt eingefügt.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required>
                  <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="field" placeholder="Charaktername" />
                </Field>
                <Field label="Name von {{user}}">
                  <input value={formData.playerAddressName || ''} onChange={e => setFormData({ ...formData, playerAddressName: e.target.value })} className="field" placeholder="User" />
                </Field>
              </div>

              <Field label="Avatar">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
                    {formData.avatarUrl ? <img src={formData.avatarUrl} className="h-full w-full object-cover" alt="Avatar" /> : <ImageIcon className="h-7 w-7 text-zinc-700" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300"><Upload className="h-4 w-4" /> Bild wählen</button>
                    <input value={formData.avatarUrl?.startsWith('data:') ? '' : formData.avatarUrl || ''} onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })} className="field" placeholder="oder https://…" />
                  </div>
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Alter (App-Metadatum)"><input value={formData.age || ''} onChange={e => setFormData({ ...formData, age: e.target.value })} className="field" /></Field>
                <Field label="Character Version"><input value={formData.characterVersion || ''} onChange={e => setFormData({ ...formData, characterVersion: e.target.value })} className="field" placeholder="1.0" /></Field>
              </div>

              <Field label="Creator"><input value={formData.creator || ''} onChange={e => setFormData({ ...formData, creator: e.target.value })} className="field" /></Field>
              <Field label="Tags (Komma-getrennt)"><input value={(formData.tags || []).join(', ')} onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} className="field" /></Field>
              <Field label="Creator Notes" hint="Nur für Menschen sichtbar; wirkt nicht auf den Charakter."><textarea rows={4} value={formData.creatorNotes || ''} onChange={e => setFormData({ ...formData, creatorNotes: e.target.value })} className="field" /></Field>
            </section>
          )}

          {activeTab === 'definition' && (
            <section className="space-y-5">
              <PromptNotice />
              <Field label="Description" hint="Chub: Aussehen, Backstory, Verhalten, wichtige Fakten und Beziehungen können gemeinsam hier beschrieben werden.">
                <textarea rows={10} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="field" placeholder="Wer ist {{char}}? Was muss das Modell dauerhaft über {{char}} wissen?" />
              </Field>
              <Field label="Personality" hint="Kurze, klare Zusammenfassung der Persönlichkeit und des Auftretens.">
                <textarea rows={6} value={formData.personality || ''} onChange={e => setFormData({ ...formData, personality: e.target.value })} className="field" placeholder="Persönlichkeit, Ton, Verhaltensmuster …" />
              </Field>
              <Field label="Scenario" hint="Aktuelle Umstände und Kontext der Unterhaltung. Hier sollte stehen, ob Figuren Fremde sind oder bereits eine Vorgeschichte haben.">
                <textarea rows={6} value={formData.scenario || ''} onChange={e => setFormData({ ...formData, scenario: e.target.value })} className="field" placeholder="Wo beginnt die Story und wie stehen {{char}} und {{user}} zu diesem Zeitpunkt zueinander?" />
              </Field>
            </section>
          )}

          {activeTab === 'start' && (
            <section className="space-y-5">
              <PromptNotice />
              <Field label="Initial Message / first_mes" hint="Wird als erste Nachricht des Charakters verwendet. Für Chats in einer anderen Sprache lokalisiert die App diese Nachricht beim Start, ohne die Card umzuschreiben.">
                <textarea rows={10} value={formData.firstMes || ''} onChange={e => setFormData({ ...formData, firstMes: e.target.value })} className="field" placeholder="Erste Nachricht von {{char}} …" />
              </Field>

              <Field label="Alternate Greetings" hint="Zusätzliche Startnachrichten / Swipes.">
                <div className="space-y-2">
                  {(formData.alternateGreetings || []).map((greeting, index) => (
                    <div key={index} className="flex gap-2">
                      <textarea
                        rows={4}
                        value={greeting}
                        onChange={e => {
                          const list = [...(formData.alternateGreetings || [])];
                          list[index] = e.target.value;
                          setFormData({ ...formData, alternateGreetings: list });
                        }}
                        className="field flex-1"
                      />
                      <button onClick={() => setFormData({ ...formData, alternateGreetings: (formData.alternateGreetings || []).filter((_, i) => i !== index) })} className="self-start rounded-xl bg-zinc-900 p-2.5 text-zinc-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <textarea rows={3} value={newGreeting} onChange={e => setNewGreeting(e.target.value)} className="field flex-1" placeholder="Weiteres Greeting …" />
                    <button
                      onClick={() => {
                        if (!newGreeting.trim()) return;
                        setFormData({ ...formData, alternateGreetings: [...(formData.alternateGreetings || []), newGreeting] });
                        setNewGreeting('');
                      }}
                      className="self-start rounded-xl bg-rose-600 p-2.5 text-white"
                    ><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </Field>

              <Field label="Example Dialogues / mes_example" hint="Chub-kompatible Dialogbeispiele; <START>, {{user}} und {{char}} können verwendet werden.">
                <textarea rows={12} value={formData.mesExample || ''} onChange={e => setFormData({ ...formData, mesExample: e.target.value })} className="field font-mono text-xs" placeholder={'<START>\n{{user}}: …\n{{char}}: …'} />
              </Field>
            </section>
          )}

          {activeTab === 'advanced' && (
            <section className="space-y-5">
              <PromptNotice />
              <Field label="System Prompt" hint="Character Card V2: ersetzt den globalen System Prompt, wenn nicht leer. {{original}} wird unterstützt.">
                <textarea rows={8} value={formData.systemPrompt || ''} onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })} className="field font-mono text-xs" placeholder="Leer = globaler Chub-kompatibler Fallback" />
              </Field>
              <Field label="Post History Instructions" hint="Character Card V2: steht nach der Chat History. {{original}} und Chub-Prompt-Makros werden unterstützt.">
                <textarea rows={8} value={formData.postHistoryInstructions || ''} onChange={e => setFormData({ ...formData, postHistoryInstructions: e.target.value })} className="field font-mono text-xs" />
              </Field>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-black text-zinc-200">App-spezifisch: Situative Bilder</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">Diese Felder steuern nur die Bildfunktion und sind keine Character-Card-Promptfelder.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <select value={formData.imageFrequency || 'occasional'} onChange={e => setFormData({ ...formData, imageFrequency: e.target.value as ImageFrequency })} className="field">
                    <option value="disabled">Deaktiviert</option>
                    <option value="rare">Selten</option>
                    <option value="occasional">Gelegentlich</option>
                    <option value="frequent">Häufig</option>
                    <option value="very_frequent">Sehr häufig</option>
                  </select>
                  <input value={formData.imageStyleDescription || ''} onChange={e => setFormData({ ...formData, imageStyleDescription: e.target.value })} className="field" placeholder="Bildstil / Look" />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'lore' && (
            <section className="space-y-5">
              <PromptNotice />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Scan depth"><input type="number" min={0} value={book.scan_depth ?? 4} onChange={e => updateBook({ scan_depth: Number(e.target.value) })} className="field" /></Field>
                <Field label="Token budget"><input type="number" min={0} value={book.token_budget ?? ''} onChange={e => updateBook({ token_budget: e.target.value === '' ? undefined : Number(e.target.value) })} className="field" placeholder="optional" /></Field>
                <Field label="Recursive scanning">
                  <button onClick={() => updateBook({ recursive_scanning: !book.recursive_scanning })} className={`field flex items-center justify-between ${book.recursive_scanning ? 'text-emerald-300' : 'text-zinc-500'}`}>
                    {book.recursive_scanning ? 'Aktiv' : 'Aus'} <ChevronDown className="h-4 w-4" />
                  </button>
                </Field>
              </div>

              <div className="space-y-3">
                {book.entries.map((entry, index) => (
                  <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <input value={entry.name || ''} onChange={e => updateEntry(index, { name: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-black text-zinc-200 outline-none" placeholder={`Lore Entry ${index + 1}`} />
                      <button onClick={() => removeEntry(index)} className="rounded-xl p-2 text-zinc-600 hover:bg-rose-950/30 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Keys"><input value={(entry.keys || []).join(', ')} onChange={e => updateEntry(index, { keys: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} className="field" placeholder="library, rain" /></Field>
                      <Field label="Secondary keys"><input value={(entry.secondary_keys || []).join(', ')} onChange={e => updateEntry(index, { secondary_keys: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} className="field" /></Field>
                    </div>
                    <Field label="Content"><textarea rows={5} value={entry.content} onChange={e => updateEntry(index, { content: e.target.value })} className="field" /></Field>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <Toggle label="Enabled" active={entry.enabled !== false} onClick={() => updateEntry(index, { enabled: entry.enabled === false })} />
                      <Toggle label="Constant" active={entry.constant === true} onClick={() => updateEntry(index, { constant: !entry.constant })} />
                      <Toggle label="Selective" active={entry.selective === true} onClick={() => updateEntry(index, { selective: !entry.selective })} />
                      <Toggle label="Case sensitive" active={entry.case_sensitive === true} onClick={() => updateEntry(index, { case_sensitive: !entry.case_sensitive })} />
                      <select value={entry.position || 'after_char'} onChange={e => updateEntry(index, { position: e.target.value as 'before_char' | 'after_char' })} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-400">
                        <option value="before_char">before_char</option>
                        <option value="after_char">after_char</option>
                      </select>
                    </div>
                  </div>
                ))}

                <button onClick={() => updateBook({ entries: [...book.entries, createLoreEntry(book.entries.length)] })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 py-4 text-xs font-bold text-zinc-500 hover:border-rose-500/40 hover:text-rose-300">
                  <Plus className="h-4 w-4" /> Lore Entry hinzufügen
                </button>
              </div>
            </section>
          )}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-900 bg-[#0b0b0d]/95 px-5 py-4">
          <p className="hidden text-[10px] leading-relaxed text-zinc-600 sm:block">Promptfelder sind im Diagnostics Inspector nachvollziehbar.</p>
          <button onClick={handleSave} className="ml-auto flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-lg">
            <Save className="h-4 w-4" /> {saved ? 'Gespeichert' : 'Speichern'}
          </button>
        </footer>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; required?: boolean; children: React.ReactNode }> = ({ label, hint, required, children }) => (
  <label className="block space-y-2">
    <span className="text-xs font-black text-zinc-300">{label}{required && <span className="text-rose-400"> *</span>}</span>
    {children}
    {hint && <span className="block text-[11px] leading-relaxed text-zinc-600">{hint}</span>}
  </label>
);

const PromptNotice = () => (
  <div className="rounded-2xl border border-rose-900/25 bg-rose-950/10 p-3 text-xs leading-relaxed text-rose-100/75">
    Alles in diesem Bereich ist Teil der Character Definition bzw. der V2-Promptsteuerung. Es ist kein dekoratives Profilfeld.
  </div>
);

const Toggle: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-1.5 ${active ? 'border-rose-500/40 bg-rose-950/25 text-rose-300' : 'border-zinc-800 bg-zinc-900 text-zinc-600'}`}>
    {label}
  </button>
);
