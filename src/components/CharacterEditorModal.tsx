import React, { useState, useRef } from 'react';
import { Character, MemoryItem, ImageFrequency, DominanceLevel } from '../types';
import {
  User,
  Sparkles,
  Save,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  MessageSquare,
  Shield,
  Heart,
  Flame,
  FileText,
  Smile,
  Zap,
  Tag,
  Palette,
  Sliders,
  X
} from 'lucide-react';
import deanAvatarImg from '../assets/images/dean_ghost_avatar_1787588593778.jpg';

interface CharacterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  onSave: (character: Character) => void;
}

type TabType =
  | 'basics'
  | 'appearance'
  | 'personality'
  | 'style'
  | 'nicknames'
  | 'starter'
  | 'images'
  | 'rules'
  | 'memories';

export const CharacterEditorModal: React.FC<CharacterEditorModalProps> = ({
  isOpen,
  onClose,
  character,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(character?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const [formData, setFormData] = useState<Partial<Character>>(() => {
    if (character) {
      return { ...character };
    }
    return {
      id: `char-${Date.now()}`,
      name: '',
      avatarUrl: '',
      age: '26',
      appearance: '',
      personality: '',
      background: '',
      relationshipToPlayer: '',
      writingStyle: '',
      toneOfVoice: '',
      typicalPhrases: '',
      playerAddressName: 'Lidii',
      nicknames: '',
      thoughtsEnabled: true,
      initiativeLevel: 'high',
      flirtBehavior: 'intense',
      dominanceLevel: 'dominant',
      humorLevel: 'dark',
      imageFrequency: 'occasional',
      imageStyleDescription: '',
      startPlot: '',
      startBehavior: '',
      behaviorRules: '1. Treibe Handlungen proaktiv voran.\n2. Bestimme niemals Lidiis Gedanken oder Gefühle.\n3. Verwende Schweizer Rechtschreibung mit «ss» statt «ß».',
      startPrompt: '',
      customInstructions: '',
      memories: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<'plot' | 'detail' | 'trait' | 'relationship'>('detail');
  const [activeTab, setActiveTab] = useState<TabType>('basics');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setFormData((prev) => ({
          ...prev,
          avatarUrl: event.target?.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddMemory = () => {
    if (!newMemoryContent.trim()) return;
    const newMem: MemoryItem = {
      id: `mem-${Date.now()}`,
      category: newMemoryCategory,
      content: newMemoryContent.trim(),
      createdAt: Date.now(),
    };
    setFormData((prev) => ({
      ...prev,
      memories: [...(prev.memories || []), newMem],
    }));
    setNewMemoryContent('');
  };

  const handleDeleteMemory = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      memories: (prev.memories || []).filter((m) => m.id !== id),
    }));
  };

  const DOMINANCE_LEVELS: { id: DominanceLevel; label: string; desc: string }[] = [
    { id: 'level_1_very_restrained', label: '1. Sehr zurückhaltend', desc: 'Vollkommen abwartend, überlässt der Nutzerin die volle Initiative und Führung.' },
    { id: 'level_2_gentle', label: '2. Sanft', desc: 'Behutsam, vorsichtig, bietet leise Impulse ohne Zwang oder Druck.' },
    { id: 'level_3_lightly_leading', label: '3. Leicht führend', desc: 'Gibt charmante Richtungen vor, fragt aufmerksam nach, führt unaufdringlich.' },
    { id: 'level_4_confident', label: '4. Selbstbewusst', desc: 'Präsent, sicher, handelt auf Augenhöhe mit klarer eigener Haltung.' },
    { id: 'level_5_dominant', label: '5. Dominant', desc: 'Bestimmt, fordernd, übernimmt proaktiv die Führung und trifft Entscheidungen im Raum.' },
    { id: 'level_6_strongly_dominant', label: '6. Stark dominant', desc: 'Sehr bestimmend, kompromisslos präsent, setzt spürbare Akzente und fordert Reaktionen.' },
    { id: 'level_7_controlling', label: '7. Kontrollierend', desc: 'Beansprucht die Kontrolle über die Situation, schneidet Ausflüchte ab, lenkt den Ablauf.' },
    { id: 'level_8_very_controlling', label: '8. Sehr kontrollierend', desc: 'Intensiv führend, fordert Hingabe oder Unterordnung heraus, lässt wenig Raum für Zögern.' },
    { id: 'level_9_extremely_dominant', label: '9. Extrem dominant', desc: 'Maximale psychologische und situative Dominanz, absolute Führung der Szene.' },
  ];

  const DYNAMICS_CATEGORIES = [
    {
      category: 'Dominanz & Macht',
      items: ['Dominant', 'Submissive', 'Switch', 'Master', 'Mistress', 'Power Exchange'],
    },
    {
      category: 'Spielstil',
      items: ['Brat', 'Brat Tamer', 'Primal', 'Primal Dom', 'Primal Prey', 'Caregiver Dom', 'Daddy Dom', 'Service Dom', 'Service Sub', 'Service Top', 'Service Bottom'],
    },
    {
      category: 'Rollen (Handlungsrolle)',
      items: ['Top', 'Bottom', 'Rigger', 'Rope Bunny'],
    },
    {
      category: 'Weitere Dynamiken',
      items: ['Sadist', 'Masochist', 'Pet', 'Owner', 'Slave'],
    },
  ];

  const HUMOR_STYLES_LIST = [
    'Kein Humor',
    'Sehr trocken',
    'Trocken',
    'Sarkastisch',
    'Ironisch',
    'Zynisch',
    'Schwarzer Humor',
    'Schlagfertig',
    'Neckisch',
    'Spielerisch',
    'Frech',
    'Provokant',
    'Flirty',
    'Charmant',
    'Albern',
    'Situationskomik',
    'Wortwitz',
    'Deadpan',
  ];

  const toggleDynamic = (item: string) => {
    const current = formData.dynamics || [];
    if (current.includes(item)) {
      setFormData({ ...formData, dynamics: current.filter((d) => d !== item) });
    } else {
      setFormData({ ...formData, dynamics: [...current, item] });
    }
  };

  const toggleHumorStyle = (item: string) => {
    const current = formData.humorStyles || [];
    if (current.includes(item)) {
      setFormData({ ...formData, humorStyles: current.filter((h) => h !== item) });
    } else {
      setFormData({ ...formData, humorStyles: [...current, item] });
    }
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert('Bitte gib dem Charakter einen Namen.');
      return;
    }

    const finalChar: Character = {
      id: formData.id || `char-${Date.now()}`,
      name: formData.name.trim(),
      avatarUrl: formData.avatarUrl || '',
      age: formData.age || '',
      appearance: formData.appearance || '',
      personality: formData.personality || '',
      background: formData.background || '',
      relationshipToPlayer: formData.relationshipToPlayer || '',
      writingStyle: formData.writingStyle || '',
      toneOfVoice: formData.toneOfVoice || '',
      typicalPhrases: formData.typicalPhrases || '',
      playerAddressName: formData.playerAddressName?.trim() || 'Lidii',
      addressMode: formData.addressMode || 'auto',
      nicknames: formData.nicknames || '',
      thoughtsEnabled: formData.thoughtsEnabled !== false,
      initiativeLevel: formData.initiativeLevel || 'high',
      flirtBehavior: formData.flirtBehavior || 'intense',
      dominanceLevel: formData.dominanceLevel || 'level_5_dominant',
      dynamics: formData.dynamics || [],
      humorLevel: formData.humorLevel || 'dark',
      humorStyles: formData.humorStyles || [],
      imageFrequency: formData.imageFrequency || 'occasional',
      imageStyleDescription: formData.imageStyleDescription || '',
      startPlot: formData.startPlot || '',
      startBehavior: formData.startBehavior || '',
      behaviorRules: formData.behaviorRules || '',
      startPrompt: formData.startPrompt || '',
      customInstructions: formData.customInstructions || '',
      memories: formData.memories || [],
      createdAt: formData.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(finalChar);
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
    }, 3000);
  };

  const presetAvatars = [
    { label: 'Dean (CoD Ghost Maske)', url: deanAvatarImg },
    { label: 'Julian (London Galerie)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80' },
    { label: 'Dunkel & Taktisch', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80' },
    { label: 'Edel & Maskulin', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80' },
  ];

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'basics', label: 'Basis', icon: <User className="h-4 w-4" /> },
    { id: 'appearance', label: 'Aussehen', icon: <Palette className="h-4 w-4" /> },
    { id: 'personality', label: 'Persönlichkeit & Dynamik', icon: <Flame className="h-4 w-4" /> },
    { id: 'style', label: 'Schreibstil', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'nicknames', label: 'Anreden', icon: <Tag className="h-4 w-4" /> },
    { id: 'starter', label: 'Start eines Chats', icon: <Zap className="h-4 w-4" /> },
    { id: 'images', label: 'Bilder im Chat', icon: <ImageIcon className="h-4 w-4" /> },
    { id: 'rules', label: 'Regeln & KI', icon: <Shield className="h-4 w-4" /> },
    { id: 'memories', label: 'Gedächtnis', icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div
      id="character-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="flex h-[92vh] max-h-[820px] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950/60 text-rose-400 ring-1 ring-rose-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                {isEditing ? `Charakterprofil: ${formData.name || 'Bearbeiten'}` : 'Neuen Charakter erstellen'}
              </h2>
              <p className="text-xs text-zinc-400">
                Dauerhafte Einstellungen für Persönlichkeit, Schreibstil, Startverhalten & Bilder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation (Horizontal scrollable bar) */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-900/30 px-3 py-2 overflow-x-auto gap-1.5 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50 ring-1 ring-rose-400/40'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-zinc-200">
          {/* TAB 1: BASIS */}
          {activeTab === 'basics' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Name des Charakters *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Dean (nur Vorname, ohne Nachname)"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Wird überall als Absendername und Anrede verwendet (z.B. „Dean“).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Alter
                  </label>
                  <input
                    type="text"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="z.B. 28"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Avatar Section */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Profilbild des Charakters
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative shrink-0">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Avatar Preview"
                        referrerPolicy="no-referrer"
                        className="h-24 w-24 rounded-2xl object-cover ring-2 ring-rose-500/50 shadow-lg"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-800 border border-dashed border-zinc-700 text-zinc-400">
                        <ImageIcon className="h-8 w-8 opacity-50" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    {/* File upload from device gallery */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow transition-all"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Bild aus Galerie auswählen</span>
                      </button>
                      {formData.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, avatarUrl: '' })}
                          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        >
                          Entfernen
                        </button>
                      )}
                    </div>

                    {/* Or URL input */}
                    <div>
                      <input
                        type="text"
                        value={formData.avatarUrl?.startsWith('data:') ? '' : formData.avatarUrl || ''}
                        onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                        placeholder="Oder Bild-URL einfügen (https://...)"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    {/* Presets */}
                    <div>
                      <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                        Vorlagen:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {presetAvatars.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData({ ...formData, avatarUrl: p.url })}
                            className="rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-rose-500/50 hover:bg-zinc-800"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard Player Address Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Standard-Name der Spielerin
                </label>
                <input
                  type="text"
                  value={formData.playerAddressName || 'Lidii'}
                  onChange={(e) => setFormData({ ...formData, playerAddressName: e.target.value })}
                  placeholder="Lidii"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Wie der Charakter dich standardmässig nennt (Standard: „Lidii“).
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: AUSSEHEN & HINTERGRUND */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Aussehen & Physische Merkmale
                </label>
                <textarea
                  rows={4}
                  value={formData.appearance || ''}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  placeholder="z.B. Muskulös, breite Schultern, dunkle Kleidung, Call of Duty Ghost-Schädelmaske über der unteren Gesichtshälfte, scharfe markante Wangenknochen..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Detaillierte Beschreibung des Körpers, der Statur, der Kleidung und markanter Merkmale.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Hintergrundgeschichte
                </label>
                <textarea
                  rows={4}
                  value={formData.background || ''}
                  onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                  placeholder="z.B. Wuchs in den rauen Strassenzügen der Bronx auf. Hat sich ein eigenes Duplex aufgebaut. Kennt jede Ecke..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Beziehung zur Spielerin ({formData.playerAddressName || 'Lidii'})
                </label>
                <textarea
                  rows={3}
                  value={formData.relationshipToPlayer || ''}
                  onChange={(e) => setFormData({ ...formData, relationshipToPlayer: e.target.value })}
                  placeholder="z.B. Kennt sie aus der Bibliothek; begegnet ihr mit dunkler Dominanz, Faszination für ihr Verlangen nach Gefahr und Kontrollverlust..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: PERSÖNLICHKEIT & DYNAMIK */}
          {activeTab === 'personality' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Persönlichkeit & Wesenszüge
                </label>
                <textarea
                  rows={3}
                  value={formData.personality || ''}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="z.B. Selbstbewusst, direkt, provokant, analytisch, ruhig unter Druck, eigeninitiativ..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Dominance Levels (1-9) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Grundlegender Dominanzgrad (1 bis 9)
                </label>
                <select
                  value={formData.dominanceLevel || 'level_5_dominant'}
                  onChange={(e) => setFormData({ ...formData, dominanceLevel: e.target.value as DominanceLevel })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  {DOMINANCE_LEVELS.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.label} – {lvl.desc}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  {DOMINANCE_LEVELS.find((l) => l.id === formData.dominanceLevel)?.desc ||
                    'Bestimmt das Ausmass an Führung, Initiative und Raumforderung.'}
                </p>
              </div>

              {/* Dynamiken / Rollen / Präferenzen (Mehrfachauswahl) */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Dynamiken, Rollen & Spielstile (Mehrfachauswahl)
                </label>
                <p className="text-[11px] text-zinc-400 mb-3">
                  Wähle alle passenden Ausprägungen für diesen Charakter. BDSM-Rollen (Top/Bottom) und Machtdynamiken (Dom/Sub) können frei kombiniert werden.
                </p>

                <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                  {DYNAMICS_CATEGORIES.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
                        {cat.category}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((item) => {
                          const isSelected = (formData.dynamics || []).includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleDynamic(item)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                              }`}
                            >
                              {isSelected ? `✓ ${item}` : item}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Humor Multi-Select */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Humor & Tonalität (Mehrfachauswahl)
                </label>
                <p className="text-[11px] text-zinc-400 mb-2.5">
                  Wähle die Nuancen, die der Charakter im Gespräch und in seinen Reaktionen anwendet.
                </p>
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                  {HUMOR_STYLES_LIST.map((hStyle) => {
                    const isSelected = (formData.humorStyles || []).includes(hStyle);
                    return (
                      <button
                        key={hStyle}
                        type="button"
                        onClick={() => toggleHumorStyle(hStyle)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                        }`}
                      >
                        {isSelected ? `✓ ${hStyle}` : hStyle}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pacing, Plot Initiative & Flirt behavior */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Erzähltempo (Pacing / Slow Burn)
                  </label>
                  <select
                    value={formData.pacing || 'slow_burn'}
                    onChange={(e) => setFormData({ ...formData, pacing: e.target.value as any })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="slow_burn">Slow Burn (Langsamer, atmosphärischer Aufbau)</option>
                    <option value="balanced">Ausgewogen (Natürliches Tempo)</option>
                    <option value="fast">Schneller Handlungsfluss</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Plot-Initiative
                  </label>
                  <select
                    value={formData.plotInitiative || formData.initiativeLevel || 'high'}
                    onChange={(e) => setFormData({ ...formData, plotInitiative: e.target.value as any, initiativeLevel: e.target.value as any })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="high">Hoch (Proaktiv Szene bewegen & Akzente setzen)</option>
                    <option value="medium">Mittel (Ausgewogen zwischen Agieren & Reagieren)</option>
                    <option value="low">Niedrig (Reaktiv, lässt der Spielerin den Vortritt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Flirt- & Anziehungsverhalten
                  </label>
                  <select
                    value={formData.flirtBehavior || 'intense'}
                    onChange={(e) => setFormData({ ...formData, flirtBehavior: e.target.value as any })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="intense">Intensiv / Spicy (Körperlich präsent, knisternd)</option>
                    <option value="playful">Verspielt / Neckend</option>
                    <option value="subtle">Subtil / Dezent</option>
                    <option value="none">Kein Flirt / Neutral</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SCHREIBSTIL & STIMME */}
          {activeTab === 'style' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Schreibstil & Erzählweise
                </label>
                <textarea
                  rows={3}
                  value={formData.writingStyle || ''}
                  onChange={(e) => setFormData({ ...formData, writingStyle: e.target.value })}
                  placeholder="z.B. Atmosphärisch, sensorisch dicht, packend, voller körperlicher Präsenz..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Tonfall & Stimme
                </label>
                <input
                  type="text"
                  value={formData.toneOfVoice || ''}
                  onChange={(e) => setFormData({ ...formData, toneOfVoice: e.target.value })}
                  placeholder="z.B. Tief, rau, trocken, spöttisch, fordernd und kontrolliert"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Typische Sätze & Ausdrücke
                </label>
                <textarea
                  rows={2}
                  value={formData.typicalPhrases || ''}
                  onChange={(e) => setFormData({ ...formData, typicalPhrases: e.target.value })}
                  placeholder="z.B. „Glaubst du wirklich, du entkommst mir?“, „Sieh mich an …“"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <input
                  type="checkbox"
                  id="toggle-thoughts-enabled"
                  checked={formData.thoughtsEnabled !== false}
                  onChange={(e) => setFormData({ ...formData, thoughtsEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="toggle-thoughts-enabled" className="text-xs text-zinc-300 cursor-pointer">
                  <span className="font-bold text-zinc-100 block">Gedanken in *kursiver* Schrift rendern</span>
                  Eigene Gedanken des Charakters werden stilvoll ohne sichtbare Sternchen kursiv dargestellt.
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: ANREDEN & SPITZNAMEN */}
          {activeTab === 'nicknames' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <h3 className="text-sm font-bold text-zinc-100 mb-1 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-rose-400" />
                  Anreden & Spitznamen
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Wie spricht der Charakter die Nutzerin an? Die KI wählt Anreden und Spitznamen dynamisch passend zu Situation, Stimmung und Beziehungsentwicklung aus.
                </p>
              </div>

              {/* Address Mode */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Modus der Anrede
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, addressMode: 'auto' })}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all ${
                      formData.addressMode !== 'custom'
                        ? 'border-rose-500 bg-rose-950/30 text-zinc-100 ring-1 ring-rose-500/40'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-zinc-200">
                      <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                      Automatisch aus Charakter & Kontext
                    </div>
                    <span className="text-[11px] text-zinc-400 leading-relaxed">
                      Die KI entscheidet im laufenden Rollenspiel selbst, welche Anrede passend ist, variiert dynamisch und vermeidet monotone Wiederholungen.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, addressMode: 'custom' })}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all ${
                      formData.addressMode === 'custom'
                        ? 'border-rose-500 bg-rose-950/30 text-zinc-100 ring-1 ring-rose-500/40'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-xs text-zinc-200">
                      <Tag className="h-3.5 w-3.5 text-rose-400" />
                      Mit zusätzlichen Hinweisen
                    </div>
                    <span className="text-[11px] text-zinc-400 leading-relaxed">
                      Erlaube zusätzliche Begriffe oder spezifische Anreden, die der Charakter gelegentlich einfliessen lassen darf.
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Optional: Begriffe oder Anreden, die der Charakter gelegentlich verwenden darf
                </label>
                <textarea
                  rows={3}
                  value={formData.nicknames || ''}
                  onChange={(e) => setFormData({ ...formData, nicknames: e.target.value })}
                  placeholder="Optional: Begriffe, Kosenamen oder provokante Anreden, die zum Charakter passen..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Keine Pflicht. Wenn leer, wählt die KI völlig frei die stimmigsten Anreden basierend auf Persönlichkeit und Beziehungsdynamik.
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: START EINES CHATS */}
          {activeTab === 'starter' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-rose-950/60 bg-rose-950/20 p-4">
                <h3 className="text-sm font-bold text-rose-300 mb-1 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Automatischer Szenenstart für neue Chats
                </h3>
                <p className="text-xs text-zinc-400">
                  Wenn ein neuer Chat erstellt wird, wartet {formData.name || 'der Charakter'} nicht passiv auf dich, sondern erzeugt automatisch eine packende Eröffnungsnachricht basierend auf diesen zwei Feldern:
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  1. Startplot (Ausgangssituation & Szene)
                </label>
                <textarea
                  rows={3}
                  value={formData.startPlot || ''}
                  onChange={(e) => setFormData({ ...formData, startPlot: e.target.value })}
                  placeholder="z.B. Ehemalige Stadtbibliothek am späten Abend. Kaltes Licht, verregnete Strassen draussen..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Beschreibt den Ort, das Wetter und die Ausgangslage für neue Chats.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  2. Startverhalten (Auftreten & Haltung zum Start)
                </label>
                <textarea
                  rows={3}
                  value={formData.startBehavior || ''}
                  onChange={(e) => setFormData({ ...formData, startBehavior: e.target.value })}
                  placeholder="z.B. Beobachtet die Szene mit ruhiger, berechnender Präsenz. Tritt aus dem Schatten hervor, spricht leise und direkt..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Wie der Charakter zu Beginn der Szene auftritt und die Dynamik anführt.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Manueller Fallback-Starttext (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.startPrompt || ''}
                  onChange={(e) => setFormData({ ...formData, startPrompt: e.target.value })}
                  placeholder="Optionaler fester Text als Fallback, falls die KI keine dynamische Startnachricht generieren soll."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 7: BILDER IM CHAT */}
          {activeTab === 'images' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-rose-950/60 bg-rose-950/20 p-4">
                <h3 className="text-sm font-bold text-rose-300 mb-1 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Situative Bilder im Chat
                </h3>
                <p className="text-xs text-zinc-400">
                  Bestimme, wie oft und in welchem visuellen Stil dieser Charakter situative Fotos (z.B. Selfies, Outfit-Checks, Umgebungsbilder) in den Chat sendet.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Bilder-Häufigkeit im Chat
                </label>
                <select
                  value={formData.imageFrequency || 'occasional'}
                  onChange={(e) => setFormData({ ...formData, imageFrequency: e.target.value as ImageFrequency })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  <option value="disabled">Aus (Keine automatischen Bilder)</option>
                  <option value="rare">Selten (Nur bei besonderen Momenten)</option>
                  <option value="occasional">Gelegentlich (Standard – passende Momente)</option>
                  <option value="frequent">Häufig</option>
                  <option value="very_frequent">Sehr häufig (Regelmässig)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Visueller Bildstil des Charakters
                </label>
                <textarea
                  rows={4}
                  value={formData.imageStyleDescription || ''}
                  onChange={(e) => setFormData({ ...formData, imageStyleDescription: e.target.value })}
                  placeholder="z.B. Dunkel, fotorealistisch, maskiert mit echter taktischer Call of Duty Ghost-Schädelmaske, schwarze Kleidung, athletisch, filmische Beleuchtung, düstere Bronx-Atmosphäre, kein Cartoon/Anime."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Wird bei situativen Bildgenerierungen herangezogen, um das konsistente Aussehen sicherzustellen.
                </p>
              </div>
            </div>
          )}

          {/* TAB 8: REGELN & KI */}
          {activeTab === 'rules' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Spezifische Verhaltensregeln
                </label>
                <textarea
                  rows={6}
                  value={formData.behaviorRules || ''}
                  onChange={(e) => setFormData({ ...formData, behaviorRules: e.target.value })}
                  placeholder="1. Treibe Handlungen proaktiv voran...\n2. Bestimme niemals Lidiis Gedanken...\n3. Schweizer Rechtschreibung mit «ss»..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 font-mono placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Dialogbeispiele (Character Card V2 mes_example)
                </label>
                <textarea
                  rows={4}
                  value={formData.exampleDialogues || ''}
                  onChange={(e) => setFormData({ ...formData, exampleDialogues: e.target.value })}
                  placeholder={`<START>\n{{user}}: I keep writing in my notebook without looking up.\n{{char}}: Ich bleibe ruhig sitzen, blättere eine Seite um und widme mich meinen Notizen.`}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 font-mono placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Nutze &lt;START&gt;, &#123;&#123;user&#125;&#125; und &#123;&#123;char&#125;&#125;, um typische Reaktionen und Tonfall beispielhaft zu modellieren.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Post-History Anweisungen (Character Card V2 post_history_instructions)
                </label>
                <textarea
                  rows={3}
                  value={formData.postHistoryInstructions || ''}
                  onChange={(e) => setFormData({ ...formData, postHistoryInstructions: e.target.value })}
                  placeholder="Instruktion, die direkt nach dem Chatverlauf zur Tonfall-Stabilisierung und Anti-Godmoding-Verankerung injiziert wird."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Verankert die Figur direkt vor der Antworterstellung fest in ihrer Ich-Perspektive und reiner Beobachtungsdisziplin.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Zusätzliche individuelle KI-Anweisungen
                </label>
                <textarea
                  rows={3}
                  value={formData.customInstructions || ''}
                  onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                  placeholder="Spezielle Instruktionen, Vokabular oder Tabus..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 9: GEDÄCHTNIS */}
          {activeTab === 'memories' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Dauerhafte Charakter-Erinnerungen
                </label>
                <span className="text-xs text-zinc-400">
                  {formData.memories?.length || 0} Einträge
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newMemoryCategory}
                    onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="detail">Detail</option>
                    <option value="relationship">Beziehung</option>
                    <option value="plot">Plot / Vergangenheit</option>
                    <option value="trait">Charakterzug</option>
                  </select>
                  <input
                    type="text"
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                    placeholder="Neues Erinnerungs-Faktum hinzufügen..."
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddMemory}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {(formData.memories || []).map((mem) => (
                  <div
                    key={mem.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3"
                  >
                    <div className="space-y-1">
                      <span className="inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                        {mem.category}
                      </span>
                      <p className="text-xs text-zinc-200">{mem.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/80 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Schliessen
          </button>
          
          <div className="flex items-center gap-3">
            {saveFeedback && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 animate-in fade-in duration-200">
                <Check className="h-4 w-4" />
                <span>Profil gespeichert!</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/60 hover:bg-rose-500 active:scale-98 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>Charakterprofil speichern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
