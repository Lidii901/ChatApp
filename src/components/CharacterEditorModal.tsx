import React, { useEffect, useRef, useState } from 'react';
import { Character, ImageFrequency, PromptRole } from '../types';
import type { CharacterBook, CharacterBookEntry, LoreSelectiveLogic } from '../types/characterCardV2';
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

const emptyBook = (): CharacterBook => ({ extensions: {}, entries: [], scan_depth: 4, recursive_scanning: false });

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

function validRole(value: unknown): PromptRole {
  return value === 'user' || value === 'assistant' || value === 'system' ? value : 'system';
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
      characterNote: '',
      characterNoteDepth: 4,
      characterNoteRole: 'system',
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

  const depthPrompt = character.extensions?.depth_prompt && typeof character.extensions.depth_prompt === 'object'
    ? character.extensions.depth_prompt
    : undefined;

  return {
    ...character,
    description: legacyDescription(character),
    personality: legacyPersonality(character),
    scenario: character.scenario !== undefined ? character.scenario : character.startPlot || '',
    firstMes: character.firstMes !== undefined ? character.firstMes : character.startPrompt || '',
    mesExample: character.mesExample !== undefined ? character.mesExample : character.exampleDialogues || '',
    postHistoryInstructions: legacyPostHistory(character),
    characterNote: character.characterNote ?? depthPrompt?.prompt ?? '',
    characterNoteDepth: character.characterNoteDepth ?? depthPrompt?.depth ?? 4,
    characterNoteRole: validRole(character.characterNoteRole ?? depthPrompt?.role),
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

function createLoreEntry(book: CharacterBook): CharacterBookEntry {
  const nextOrder = book.entries.length
    ? Math.max(...book.entries.map(entry => Number(entry.insertion_order) || 0)) + 1
    : 0;
  return {
    keys: [],
    content: '',
    insertion_order: nextOrder,
    priority: 0,
    extensions: {},
    enabled: true,
    position: 'after_char',
  };
}

function entryLogic(entry: CharacterBookEntry): LoreSelectiveLogic {
  return entry.selectiveLogic
    ?? entry.selective_logic
    ?? (entry.extensions as any)?.selectiveLogic
    ?? (entry.extensions as any)?.selective_logic
    ?? 'and_any';
}

function entryProbability(entry: CharacterBookEntry): string | number {
  const value = entry.probability ?? (entry.extensions as any)?.probability;
  return value === undefined || value === null ? '' : Number(value);
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
    setFormData(current => ({ ...current, characterBook: { ...(current.characterBook || emptyBook()), ...next } }));
  };

  const updateEntry = (index: number, patch: Partial<CharacterBookEntry>) => {
    const entries = [...book.entries];
    entries[index] = { ...entries[index], ...patch };
    updateBook({ entries });
  };

  const removeEntry = (index: number) => updateBook({ entries: book.entries.filter((_, i) => i !== index) });

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
      characterNote: formData.characterNote ?? '',
      characterNoteDepth: Math.max(0, Number(formData.characterNoteDepth ?? 4)),
      characterNoteRole: validRole(formData.characterNoteRole),
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
    { id: 'info', label: 'Profil', icon: <User className="h-4 w-4" /> },
    { id: 'definition', label: 'Charakter', icon: <FileText className="h-4 w-4" /> },
    { id: 'start', label: 'Start', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'advanced', label: 'Erweitert', icon: <Settings2 className="h-4 w-4" /> },
    { id: 'lore', label: 'Character Book', icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[94vh] w-full flex-col overflow-hidden rounded-t-[30px] border border-zinc-800 bg-[#0b0b0d] shadow-2xl sm:max-w-3xl sm:rounded-[30px]">
        <style>{`
          .field { width: 100%; border: 1px solid rgb(39 39 42); border-radius: .9rem; background: rgb(24 24 27 / .78); padding: .78rem .9rem; color: rgb(244 244 245); outline: none; }
          .field:focus { border-color: rgb(244 63 94 / .65); box-shadow: 0 0 0 1px rgb(244 63 94 / .14); }
          .field::placeholder { color: rgb(82 82 91); }
        `}</style>
        <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">Chub / Character Card V2</p>
            <h2 className="mt-1 truncate text-lg font-black text-white">{character ? formData.name || 'Charakter bearbeiten' : 'Neuer Charakter'}</h2>
            <p className="mt-1 text-[11px] text-zinc-600">Die Character-Felder werden direkt für die KI verwendet.</p>
          </div>
          <button onClick={onClose} className="ml-3 shrink-0 rounded-full bg-zinc-900 p-2 text-zinc-400"><X className="h-5 w-5" /></button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-zinc-900 px-3 py-2 scrollbar-none">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${activeTab === tab.id ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto px-5 py-5 text-sm text-zinc-300">
          {activeTab === 'info' && (
            <section className="space-y-5">
              <SectionIntro
                eyebrow="Profil"
                title="Wer ist der Charakter?"
                text="Name und Avatar sind die sichtbaren Profildaten. Creator Notes und Tags sind nur Metadaten und beeinflussen die Antworten nicht."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Charaktername" required><input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="field" placeholder="z. B. Dean" /></Field>
                <Field label="Name von dir / {{user}}" hint="Dieser Name ersetzt {{user}} in der Card."><input value={formData.playerAddressName || ''} onChange={e => setFormData({ ...formData, playerAddressName: e.target.value })} className="field" placeholder="User" /></Field>
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

              <details className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                <summary className="cursor-pointer text-xs font-black text-zinc-300">Metadaten & Anzeige</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Alter (App-Anzeige)"><input value={formData.age || ''} onChange={e => setFormData({ ...formData, age: e.target.value })} className="field" /></Field>
                    <Field label="Character Version"><input value={formData.characterVersion || ''} onChange={e => setFormData({ ...formData, characterVersion: e.target.value })} className="field" placeholder="1.0" /></Field>
                  </div>
                  <Field label="Creator"><input value={formData.creator || ''} onChange={e => setFormData({ ...formData, creator: e.target.value })} className="field" /></Field>
                  <Field label="Tags (Komma-getrennt)"><input value={(formData.tags || []).join(', ')} onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} className="field" /></Field>
                  <Field label="Creator Notes" hint="Nur für Menschen sichtbar; wird nicht in den KI-Prompt eingefügt."><textarea rows={4} value={formData.creatorNotes || ''} onChange={e => setFormData({ ...formData, creatorNotes: e.target.value })} className="field" /></Field>
                </div>
              </details>
            </section>
          )}

          {activeTab === 'definition' && (
            <section className="space-y-4">
              <SectionIntro
                eyebrow="Character Definition"
                title="So soll sich die Figur anfühlen"
                text="Diese freien Textfelder entsprechen den zentralen Chub-/Character-Card-Feldern und gehen direkt in den Prompt."
              />

              <PromptCard
                title="Aussehen & Hintergrund"
                technical="Description"
                hint="Beschreibe Aussehen, Körperbau, Kleidung, Alter, Herkunft, Beruf, Backstory und andere dauerhafte Fakten über {{char}}."
              >
                <textarea rows={9} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="field" placeholder="Wie sieht {{char}} aus? Wer ist er/sie? Welche dauerhaften Fakten muss die KI kennen?" />
              </PromptCard>

              <PromptCard
                title="Verhalten & Persönlichkeit"
                technical="Personality"
                hint="Hier bestimmst du, wie {{char}} handelt, spricht, reagiert und welche wiederkehrenden Verhaltensmuster er/sie hat."
              >
                <textarea rows={8} value={formData.personality || ''} onChange={e => setFormData({ ...formData, personality: e.target.value })} className="field" placeholder="Wie verhält sich {{char}}? Ton, Temperament, Sprache, Initiative, typische Reaktionen …" />
              </PromptCard>

              <PromptCard
                title="Szenario & Beziehung am Start"
                technical="Scenario"
                hint="Beschreibe die aktuelle Ausgangslage. Besonders wichtig: Kennen sich {{char}} und {{user}} bereits oder treffen sie sich zum ersten Mal?"
              >
                <textarea rows={7} value={formData.scenario || ''} onChange={e => setFormData({ ...formData, scenario: e.target.value })} className="field" placeholder="Ort, Situation, Ausgangslage und tatsächlicher Beziehungs-/Wissensstand …" />
              </PromptCard>
            </section>
          )}

          {activeTab === 'start' && (
            <section className="space-y-4">
              <SectionIntro
                eyebrow="Conversation Start"
                title="So beginnt der Chat"
                text="Die Startnachricht prägt Stil, Perspektive und Dynamik besonders stark. Die gespeicherte Card bleibt unverändert, wenn die App sie für einen EN/DE-Chat lokalisiert."
              />

              <PromptCard
                title="Startnachricht"
                technical="first_mes"
                hint="Die erste Nachricht von {{char}}. Sie wird beim Start als Character-Nachricht verwendet."
              >
                <textarea rows={11} value={formData.firstMes || ''} onChange={e => setFormData({ ...formData, firstMes: e.target.value })} className="field" placeholder="Was sagt oder tut {{char}} als Erstes?" />
              </PromptCard>

              <PromptCard
                title="Alternative Startnachrichten"
                technical="alternate_greetings"
                hint="Zusätzliche Startvarianten wie bei Chub-Swipes."
              >
                <div className="space-y-2">
                  {(formData.alternateGreetings || []).map((greeting, index) => (
                    <div key={index} className="flex gap-2">
                      <textarea rows={4} value={greeting} onChange={e => { const list = [...(formData.alternateGreetings || [])]; list[index] = e.target.value; setFormData({ ...formData, alternateGreetings: list }); }} className="field flex-1" />
                      <button type="button" onClick={() => setFormData({ ...formData, alternateGreetings: (formData.alternateGreetings || []).filter((_, i) => i !== index) })} className="self-start rounded-xl bg-zinc-900 p-2.5 text-zinc-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <textarea rows={3} value={newGreeting} onChange={e => setNewGreeting(e.target.value)} className="field flex-1" placeholder="Weitere Startvariante …" />
                    <button type="button" onClick={() => { if (!newGreeting.trim()) return; setFormData({ ...formData, alternateGreetings: [...(formData.alternateGreetings || []), newGreeting] }); setNewGreeting(''); }} className="self-start rounded-xl bg-rose-600 p-2.5 text-white"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </PromptCard>

              <PromptCard
                title="Beispieldialoge"
                technical="mes_example"
                hint="Zeige der KI, wie {{char}} spricht und reagiert. Du kannst <START>, {{user}} und {{char}} verwenden."
              >
                <textarea rows={12} value={formData.mesExample || ''} onChange={e => setFormData({ ...formData, mesExample: e.target.value })} className="field font-mono text-xs" placeholder={'<START>\n{{user}}: …\n{{char}}: …'} />
              </PromptCard>
            </section>
          )}

          {activeTab === 'advanced' && (
            <section className="space-y-4">
              <SectionIntro
                eyebrow="Advanced Definitions"
                title="Feinsteuerung"
                text="Diese Felder sind optional. Lass sie leer, wenn die normale Character Definition ausreicht."
              />

              <PromptCard
                title="System Prompt"
                technical="system_prompt"
                hint="Character Card V2: steht am Anfang des Prompts. {{original}} wird unterstützt. Leer bedeutet: globalen Fallback verwenden."
              >
                <textarea rows={8} value={formData.systemPrompt || ''} onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })} className="field font-mono text-xs" placeholder="Optional …" />
              </PromptCard>

              <PromptCard
                title="Post-History Instructions"
                technical="post_history_instructions"
                hint="Character Card V2: steht nach der Chat History und hat dadurch starken Einfluss auf die nächste Antwort. {{original}} und Prompt-Makros werden unterstützt."
              >
                <textarea rows={8} value={formData.postHistoryInstructions || ''} onChange={e => setFormData({ ...formData, postHistoryInstructions: e.target.value })} className="field font-mono text-xs" placeholder="Optional …" />
              </PromptCard>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/65 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-zinc-100">Character's Note</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Chub-artige Notiz an einer wählbaren Tiefe innerhalb der Chat History. Importierte <code>extensions.depth_prompt</code>-Daten werden hier sichtbar.</p>
                  </div>
                  <span className="rounded-lg bg-zinc-900 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">Depth Prompt</span>
                </div>
                <div className="mt-4 space-y-4">
                  <Field label="Notiz"><textarea rows={5} value={formData.characterNote || ''} onChange={e => setFormData({ ...formData, characterNote: e.target.value })} className="field font-mono text-xs" placeholder="Optional …" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tiefe"><input type="number" min={0} max={100} value={formData.characterNoteDepth ?? 4} onChange={e => setFormData({ ...formData, characterNoteDepth: Math.max(0, Number(e.target.value) || 0) })} className="field" /></Field>
                    <Field label="Rolle">
                      <select value={formData.characterNoteRole || 'system'} onChange={e => setFormData({ ...formData, characterNoteRole: e.target.value as PromptRole })} className="field">
                        <option value="system">System</option><option value="user">User</option><option value="assistant">Assistant</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </div>

              <details className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                <summary className="cursor-pointer text-xs font-black text-zinc-300">Situative Bilder (App-Funktion)</summary>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">Diese Felder gehören nicht zur Character Card V2 und steuern nur die Bildfunktion der App.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <select value={formData.imageFrequency || 'occasional'} onChange={e => setFormData({ ...formData, imageFrequency: e.target.value as ImageFrequency })} className="field">
                    <option value="disabled">Deaktiviert</option><option value="rare">Selten</option><option value="occasional">Gelegentlich</option><option value="frequent">Häufig</option><option value="very_frequent">Sehr häufig</option>
                  </select>
                  <input value={formData.imageStyleDescription || ''} onChange={e => setFormData({ ...formData, imageStyleDescription: e.target.value })} className="field" placeholder="Bildstil / Look" />
                </div>
              </details>
            </section>
          )}

          {activeTab === 'lore' && (
            <section className="space-y-5">
              <SectionIntro
                eyebrow="Character Book"
                title="Lore & Schlüsselwörter"
                text="Einträge werden nur aktiviert, wenn ihre Schlüsselwörter bzw. Regeln greifen. Damit bleiben Details verfügbar, ohne dauerhaft den gesamten Prompt zu füllen."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Scan-Tiefe"><input type="number" min={0} value={book.scan_depth ?? 4} onChange={e => updateBook({ scan_depth: Number(e.target.value) })} className="field" /></Field>
                <Field label="Token-Budget"><input type="number" min={0} value={book.token_budget ?? ''} onChange={e => updateBook({ token_budget: e.target.value === '' ? undefined : Number(e.target.value) })} className="field" placeholder="optional" /></Field>
                <Field label="Rekursives Scannen"><button type="button" onClick={() => updateBook({ recursive_scanning: !book.recursive_scanning })} className={`field flex items-center justify-between ${book.recursive_scanning ? 'text-emerald-300' : 'text-zinc-500'}`}>{book.recursive_scanning ? 'Aktiv' : 'Aus'} <ChevronDown className="h-4 w-4" /></button></Field>
              </div>

              <div className="space-y-3">
                {book.entries.map((entry, index) => (
                  <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <input value={entry.name || ''} onChange={e => updateEntry(index, { name: e.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-black text-zinc-200 outline-none" placeholder={`Lore Entry ${index + 1}`} />
                      <button type="button" onClick={() => removeEntry(index)} className="rounded-xl p-2 text-zinc-600 hover:bg-rose-950/30 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Schlüsselwörter"><input value={(entry.keys || []).join(', ')} onChange={e => updateEntry(index, { keys: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} className="field" placeholder="library, rain" /></Field>
                      <Field label="Sekundäre Schlüssel"><input value={(entry.secondary_keys || []).join(', ')} onChange={e => updateEntry(index, { secondary_keys: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} className="field" /></Field>
                    </div>
                    <Field label="Inhalt"><textarea rows={5} value={entry.content} onChange={e => updateEntry(index, { content: e.target.value })} className="field" /></Field>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Field label="Priorität"><input type="number" value={entry.priority ?? 0} onChange={e => updateEntry(index, { priority: Number(e.target.value) || 0 })} className="field" /></Field>
                      <Field label="Reihenfolge"><input type="number" value={entry.insertion_order ?? index} onChange={e => updateEntry(index, { insertion_order: Number(e.target.value) || 0 })} className="field" /></Field>
                      <Field label="Chance %"><input type="number" min={0} max={100} value={entryProbability(entry)} onChange={e => updateEntry(index, { probability: e.target.value === '' ? undefined : Math.max(0, Math.min(100, Number(e.target.value))), useProbability: e.target.value !== '' })} className="field" placeholder="100" /></Field>
                    </div>
                    {entry.selective && (
                      <Field label="Selective Logic" hint="AND ANY = mindestens ein Secondary Key; AND ALL = alle; NOT ANY/NOT ALL schliessen passende Secondary Keys aus.">
                        <select value={String(entryLogic(entry))} onChange={e => updateEntry(index, { selectiveLogic: e.target.value as LoreSelectiveLogic })} className="field">
                          <option value="and_any">AND ANY</option><option value="and_all">AND ALL</option><option value="not_any">NOT ANY</option><option value="not_all">NOT ALL</option>
                        </select>
                      </Field>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <Toggle label="Aktiv" active={entry.enabled !== false} onClick={() => updateEntry(index, { enabled: entry.enabled === false })} />
                      <Toggle label="Permanent" active={entry.constant === true} onClick={() => updateEntry(index, { constant: !entry.constant })} />
                      <Toggle label="Selektiv" active={entry.selective === true} onClick={() => updateEntry(index, { selective: !entry.selective })} />
                      <Toggle label="Gross/Klein beachten" active={entry.case_sensitive === true} onClick={() => updateEntry(index, { case_sensitive: !entry.case_sensitive })} />
                      <select value={entry.position || 'after_char'} onChange={e => updateEntry(index, { position: e.target.value as 'before_char' | 'after_char' })} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-400">
                        <option value="before_char">before_char</option><option value="after_char">after_char</option>
                      </select>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={() => updateBook({ entries: [...book.entries, createLoreEntry(book)] })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 py-4 text-xs font-bold text-zinc-500 hover:border-rose-500/40 hover:text-rose-300">
                  <Plus className="h-4 w-4" /> Lore-Eintrag hinzufügen
                </button>
              </div>
            </section>
          )}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-900 bg-[#0b0b0d]/95 px-5 py-4">
          <p className="hidden text-[10px] leading-relaxed text-zinc-600 sm:block">Gespeichert wird als Chub-/Character-Card-V2-kompatible Promptstruktur.</p>
          <button onClick={handleSave} className="ml-auto flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-lg"><Save className="h-4 w-4" /> {saved ? 'Gespeichert' : 'Speichern'}</button>
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

const SectionIntro: React.FC<{ eyebrow: string; title: string; text: string }> = ({ eyebrow, title, text }) => (
  <div className="pb-1">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400/80">{eyebrow}</p>
    <h3 className="mt-1 text-xl font-black text-white">{title}</h3>
    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500">{text}</p>
  </div>
);

const PromptCard: React.FC<{ title: string; technical: string; hint: string; children: React.ReactNode }> = ({ title, technical, hint, children }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h4 className="text-sm font-black text-zinc-100">{title}</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{hint}</p>
      </div>
      <span className="shrink-0 rounded-lg bg-rose-950/25 px-2 py-1 text-[9px] font-bold text-rose-400/80">{technical}</span>
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-1.5 ${active ? 'border-rose-500/40 bg-rose-950/25 text-rose-300' : 'border-zinc-800 bg-zinc-900 text-zinc-600'}`}>{label}</button>
);
