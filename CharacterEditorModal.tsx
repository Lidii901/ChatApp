import React, { useState, useRef } from 'react';
import { Character, MemoryItem, ImageFrequency } from '../types';
import {
  User,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  Camera,
  MessageSquare,
  Shield,
  Heart,
  Flame,
  FileText
} from 'lucide-react';
import deanAvatarImg from '../assets/images/dean_ghost_avatar_1787588593778.jpg';

interface CharacterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  onSave: (character: Character) => void;
}

export const CharacterEditorModal: React.FC<CharacterEditorModalProps> = ({
  isOpen,
  onClose,
  character,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(character?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Character>>(() => {
    if (character) {
      return { ...character };
    }
    return {
      id: `char-${Date.now()}`,
      name: '',
      avatarUrl: '',
      age: '',
      appearance: '',
      personality: '',
      background: '',
      relationshipToPlayer: '',
      writingStyle: '',
      toneOfVoice: '',
      typicalPhrases: '',
      playerAddressName: 'Lidii',
      thoughtsEnabled: true,
      initiativeLevel: 'high',
      flirtBehavior: 'intense',
      dominanceLevel: 'dominant',
      humorLevel: 'dark',
      imageFrequency: 'occasional',
      imageStyleDescription: '',
      behaviorRules: '',
      startPrompt: '',
      memories: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<'plot' | 'detail' | 'trait' | 'relationship'>('detail');
  const [activeTab, setActiveTab] = useState<'basics' | 'behavior' | 'images' | 'prompt' | 'memories'>('basics');

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
      thoughtsEnabled: formData.thoughtsEnabled !== false,
      initiativeLevel: formData.initiativeLevel || 'high',
      flirtBehavior: formData.flirtBehavior || 'intense',
      dominanceLevel: formData.dominanceLevel || 'dominant',
      humorLevel: formData.humorLevel || 'dark',
      imageFrequency: formData.imageFrequency || 'occasional',
      imageStyleDescription: formData.imageStyleDescription || '',
      behaviorRules: formData.behaviorRules || '',
      startPrompt: formData.startPrompt || '',
      memories: formData.memories || [],
      createdAt: formData.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(finalChar);
    onClose();
  };

  const presetAvatars = [
    { label: 'Dean (Ghost Maske)', url: deanAvatarImg },
    { label: 'Julian (Kurator)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80' },
    { label: 'Dunkel & Taktisch', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80' },
    { label: 'Edel & Elegant', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80' },
  ];

  return (
    <div
      id="character-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              {isEditing ? `Charakter bearbeiten: ${character?.name}` : 'Neuen Charakter erstellen'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-3 flex gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-1 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('basics')}
            className={`flex-1 min-w-[90px] rounded-lg py-1.5 font-medium transition-colors ${
              activeTab === 'basics' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Basis & Aussehen
          </button>
          <button
            onClick={() => setActiveTab('behavior')}
            className={`flex-1 min-w-[90px] rounded-lg py-1.5 font-medium transition-colors ${
              activeTab === 'behavior' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Verhalten & Tonfall
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`flex-1 min-w-[80px] rounded-lg py-1.5 font-medium transition-colors ${
              activeTab === 'images' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bilder & Fotos
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`flex-1 min-w-[90px] rounded-lg py-1.5 font-medium transition-colors ${
              activeTab === 'prompt' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Start-Prompt
          </button>
          <button
            onClick={() => setActiveTab('memories')}
            className={`flex-1 min-w-[80px] rounded-lg py-1.5 font-medium transition-colors ${
              activeTab === 'memories' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Erinnerungen ({formData.memories?.length || 0})
          </button>
        </div>

        {/* Content Area */}
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-xs">
          {/* TAB 1: BASICS */}
          {activeTab === 'basics' && (
            <div className="space-y-4">
              {/* Name & Alter */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block font-medium text-zinc-300">Name des Charakters *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z. B. Dean"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Alter</label>
                  <input
                    type="text"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="z. B. 28"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Avatar (Upload or URL) */}
              <div>
                <label className="mb-1 block font-medium text-zinc-300">Profilbild (Aus Galerie hochladen oder URL)</label>
                <div className="flex items-center gap-3">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt="Vorschau"
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-rose-500/40 shadow-lg"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500 ring-1 ring-zinc-800">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all shadow"
                      >
                        <Upload className="h-3.5 w-3.5 text-rose-400" />
                        <span>Aus Galerie wählen</span>
                      </button>
                      <input
                        type="text"
                        value={formData.avatarUrl || ''}
                        onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                        placeholder="Oder Bild-URL eingeben..."
                        className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-100 focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-zinc-500 self-center">Vorlagen:</span>
                      {presetAvatars.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatarUrl: p.url })}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Aussehen */}
              <div>
                <label className="mb-1 block font-medium text-zinc-300">Aussehen & Statur</label>
                <textarea
                  value={formData.appearance || ''}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  placeholder="Realistischer erwachsener Mann, breite Schultern, dunkle Kleidung, Ghost-Schädelmaske, Narben..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Hintergrundgeschichte */}
              <div>
                <label className="mb-1 block font-medium text-zinc-300">Hintergrundgeschichte</label>
                <textarea
                  value={formData.background || ''}
                  onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                  placeholder="Herkunft, Bronx-Duplex, Vorgeschichte, Verbindung zur Welt..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  rows={3}
                />
              </div>

              {/* Beziehung zum Spieler */}
              <div>
                <label className="mb-1 block font-medium text-zinc-300">Beziehung zu {formData.playerAddressName || 'Lidii'}</label>
                <textarea
                  value={formData.relationshipToPlayer || ''}
                  onChange={(e) => setFormData({ ...formData, relationshipToPlayer: e.target.value })}
                  placeholder="Wie steht der Charakter zu Lidii? (Besitzergreifend, dominant, fordernd, herausfordernd)..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* TAB 2: BEHAVIOR */}
          {activeTab === 'behavior' && (
            <div className="space-y-4">
              {/* Persönlichkeit */}
              <div>
                <label className="mb-1 block font-medium text-zinc-300">Persönlichkeit & Wesenszüge</label>
                <textarea
                  value={formData.personality || ''}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="z. B. Dominant, selbstbewusst, direkt, provokant, analytisch, ruhig unter Druck, flirty..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Settings Grid: Dominance, Flirt, Initiative, Humor */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Dominanz / Haltung</label>
                  <select
                    value={formData.dominanceLevel || 'dominant'}
                    onChange={(e: any) => setFormData({ ...formData, dominanceLevel: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="dominant">Dominant / Fordernd</option>
                    <option value="balanced">Ausgewogen</option>
                    <option value="restrained">Zurückhaltend / Sanft</option>
                    <option value="submissive">Unterordnend / Schüchtern</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Flirtverhalten</label>
                  <select
                    value={formData.flirtBehavior || 'intense'}
                    onChange={(e: any) => setFormData({ ...formData, flirtBehavior: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="intense">Intensiv & Provokant</option>
                    <option value="playful">Verspielt & Neckend</option>
                    <option value="subtle">Subtil & Verhalten</option>
                    <option value="none">Keines / Distanziert</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Eigeninitiative</label>
                  <select
                    value={formData.initiativeLevel || 'high'}
                    onChange={(e: any) => setFormData({ ...formData, initiativeLevel: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="high">Hoch (treibt Plot selbstständig voran)</option>
                    <option value="medium">Mittel</option>
                    <option value="low">Niedrig (abwartend)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Humor / Zynismus</label>
                  <select
                    value={formData.humorLevel || 'dark'}
                    onChange={(e: any) => setFormData({ ...formData, humorLevel: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="dark">Dunkel / Zynisch</option>
                    <option value="dry">Trocken / Sarkastisch</option>
                    <option value="playful">Verspielt / Charmant</option>
                    <option value="serious">Ernsthaft / Nüchtern</option>
                  </select>
                </div>
              </div>

              {/* Anrede & Gedanken Toggle */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Anrede für den Spieler</label>
                  <input
                    type="text"
                    value={formData.playerAddressName || 'Lidii'}
                    onChange={(e) => setFormData({ ...formData, playerAddressName: e.target.value })}
                    placeholder="Standard: Lidii"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="mb-2 flex cursor-pointer items-center gap-2 font-medium text-zinc-300">
                    <input
                      type="checkbox"
                      checked={formData.thoughtsEnabled !== false}
                      onChange={(e) => setFormData({ ...formData, thoughtsEnabled: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Eigene Gedanken in Kursivschrift (*...*) anzeigen</span>
                  </label>
                </div>
              </div>

              {/* Schreibstil & Tonfall */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Schreibstil</label>
                  <textarea
                    value={formData.writingStyle || ''}
                    onChange={(e) => setFormData({ ...formData, writingStyle: e.target.value })}
                    placeholder="z. B. Atmosphärisch, sensorisch dicht, kurze schneidende Sätze..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-300">Tonfall & Typische Ausdrücke</label>
                  <textarea
                    value={formData.toneOfVoice || ''}
                    onChange={(e) => setFormData({ ...formData, toneOfVoice: e.target.value })}
                    placeholder="z. B. Rau, tief, fordernd, trocken, spöttisch..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMAGES */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-center gap-2 text-rose-400 font-semibold mb-1">
                  <Camera className="h-4 w-4" />
                  <span>Bild- und Foto-Sendeverhalten</span>
                </div>
                <p className="text-zinc-400 text-[11.5px]">
                  Konfiguriere, wie oft und in welchem visuellen Stil dieser Charakter situative Fotos (z.B. Spiegel-Selfies, Outfits, Tatorte oder Umgebungen) in den Chat senden kann.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-300">Häufigkeit für Fotos</label>
                <select
                  value={formData.imageFrequency || 'occasional'}
                  onChange={(e: any) => setFormData({ ...formData, imageFrequency: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  <option value="disabled">Deaktiviert (Keine Fotos senden)</option>
                  <option value="rare">Selten (nur bei besonderen Momenten)</option>
                  <option value="occasional">Gelegentlich (empfohlen)</option>
                  <option value="frequent">Häufig (öfter visuelle Einblicke)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-300">
                  Visuelle Bildsprache & Foto-Stil
                </label>
                <textarea
                  value={formData.imageStyleDescription || ''}
                  onChange={(e) => setFormData({ ...formData, imageStyleDescription: e.target.value })}
                  placeholder="z. B. Dunkles Spiegel-Selfie im Halbdunkel, schwarze taktische Kleidung, Ghost-Schädelmaske, raue Backsteinwände..."
                  className="min-h-[100px] w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  rows={4}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Wird verwendet, wenn der Charakter im Chat ein Foto sendet oder du ein Foto anforderst.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: START PROMPT & RULES */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-medium text-zinc-300">
                  Standard Start-Prompt (Eröffnungsnachricht für neue Chats)
                </label>
                <textarea
                  value={formData.startPrompt || ''}
                  onChange={(e) => setFormData({ ...formData, startPrompt: e.target.value })}
                  placeholder="Die Eröffnungsnachricht, mit der dieser Charakter neue Chats beginnt..."
                  className="min-h-[140px] w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  rows={6}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Dieser Text kann beim Erstellen eines neuen Chats automatisch als erste Nachricht geladen werden.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-300">
                  Spezifische Verhaltensregeln für die KI
                </label>
                <textarea
                  value={formData.behaviorRules || ''}
                  onChange={(e) => setFormData({ ...formData, behaviorRules: e.target.value })}
                  placeholder="1. Treibe Situationen proaktiv voran.&#10;2. Bestimme niemals Lidiis Gefühle oder Gedanken.&#10;3. Schweizer Rechtschreibung mit «ss»."
                  className="min-h-[100px] w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* TAB 5: MEMORIES */}
          {activeTab === 'memories' && (
            <div className="space-y-4">
              <p className="text-zinc-400">
                Erinnerungen bleiben für diesen Charakter über alle Chats hinweg dauerhaft gespeichert und werden dem KI-Prompt mitgegeben.
              </p>

              {/* Add Memory Form */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex gap-2">
                  <select
                    value={newMemoryCategory}
                    onChange={(e: any) => setNewMemoryCategory(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 focus:outline-none"
                  >
                    <option value="detail">Detail</option>
                    <option value="relationship">Beziehung</option>
                    <option value="trait">Charaktereigenschaft</option>
                    <option value="plot">Plot / Schlüsselmoment</option>
                  </select>
                  <input
                    type="text"
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    placeholder="Neue Erinnerung hinzufügen..."
                    className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-100 focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddMemory}
                    disabled={!newMemoryContent.trim()}
                    className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>

              {/* Memory List */}
              <div className="space-y-2">
                {(!formData.memories || formData.memories.length === 0) ? (
                  <p className="py-4 text-center text-zinc-500">Keine Erinnerungen hinterlegt.</p>
                ) : (
                  formData.memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="flex items-start justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3"
                    >
                      <div className="flex flex-1 flex-col pr-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400/80">
                          {mem.category}
                        </span>
                        <p className="mt-0.5 text-zinc-200">{mem.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="rounded p-1 text-zinc-500 hover:bg-rose-950 hover:text-rose-400"
                        title="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2 text-xs font-semibold text-white shadow-md transition-all hover:from-rose-500 hover:to-rose-600"
          >
            <Save className="h-4 w-4" />
            <span>Charakter speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};

