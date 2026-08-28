import React, { useState, useEffect } from 'react';
import { Character, ChatSession, DominanceLevel, ChatLanguage, ChatCharacterSettings } from '../types';
import {
  X,
  Save,
  Check,
  Flame,
  Shield,
  Sliders,
  Sparkles,
  MapPin,
  Smile,
  Zap,
  Globe,
  Tag
} from 'lucide-react';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatSession | null;
  baseCharacter: Character;
  onSaveChat: (updatedChat: ChatSession) => void;
}

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

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  chat,
  baseCharacter,
  onSaveChat,
}) => {
  if (!isOpen || !chat) return null;

  const [title, setTitle] = useState(chat.title);
  const [language, setLanguage] = useState<ChatLanguage>(chat.language);
  const [currentScene, setCurrentScene] = useState(chat.storyContext.currentScene || '');
  
  // Chat-specific character setting overrides (falling back to base character)
  const initialSettings = chat.characterSettings || {};
  const [dominanceLevel, setDominanceLevel] = useState<DominanceLevel>(
    initialSettings.dominanceLevel || baseCharacter.dominanceLevel || 'level_5_dominant'
  );
  const [dynamics, setDynamics] = useState<string[]>(
    initialSettings.dynamics || baseCharacter.dynamics || []
  );
  const [humorLevel, setHumorLevel] = useState<'dark' | 'dry' | 'playful' | 'serious'>(
    initialSettings.humorLevel || baseCharacter.humorLevel || 'dark'
  );
  const [humorStyles, setHumorStyles] = useState<string[]>(
    initialSettings.humorStyles || baseCharacter.humorStyles || []
  );
  const [pacing, setPacing] = useState<'slow_burn' | 'balanced' | 'fast'>(
    initialSettings.pacing || baseCharacter.pacing || 'slow_burn'
  );
  const [initiativeLevel, setInitiativeLevel] = useState<'high' | 'medium' | 'low'>(
    initialSettings.initiativeLevel || baseCharacter.initiativeLevel || 'high'
  );
  const [plotInitiative, setPlotInitiative] = useState<'high' | 'medium' | 'low'>(
    initialSettings.plotInitiative || baseCharacter.plotInitiative || 'medium'
  );
  const [flirtBehavior, setFlirtBehavior] = useState<'intense' | 'playful' | 'subtle' | 'none'>(
    initialSettings.flirtBehavior || baseCharacter.flirtBehavior || 'intense'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleDynamic = (item: string) => {
    if (dynamics.includes(item)) {
      setDynamics(dynamics.filter((d) => d !== item));
    } else {
      setDynamics([...dynamics, item]);
    }
  };

  const toggleHumorStyle = (item: string) => {
    if (humorStyles.includes(item)) {
      setHumorStyles(humorStyles.filter((h) => h !== item));
    } else {
      setHumorStyles([...humorStyles, item]);
    }
  };

  const handleSave = () => {
    const updatedSettings: ChatCharacterSettings = {
      dominanceLevel,
      dynamics,
      humorLevel,
      humorStyles,
      initiativeLevel,
      plotInitiative,
      pacing,
      flirtBehavior,
    };

    const updatedChat: ChatSession = {
      ...chat,
      title: title.trim() || chat.title,
      language,
      characterSettings: updatedSettings,
      storyContext: {
        ...chat.storyContext,
        currentScene: currentScene.trim(),
      },
      updatedAt: Date.now(),
    };

    onSaveChat(updatedChat);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 450);
  };

  return (
    <div
      id="chat-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/90">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-rose-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Einstellungen für diesen Chat</h2>
              <p className="text-[10px] text-zinc-400">
                Charakter: <span className="text-zinc-200 font-medium">{baseCharacter.name}</span> (isoliert pro Chat)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-zinc-300">
          {/* Chat Title */}
          <div className="space-y-1">
            <label className="block font-medium text-zinc-200">Chat-Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Bronx-Duplex – Dunkle Nacht"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 p-2.5 text-xs text-zinc-100 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Language Selection */}
          <div className="space-y-1.5">
            <label className="block font-medium text-zinc-200 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-rose-400" />
              <span>Sprache für diesen Chat</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage('de')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-medium border transition-all ${
                  language === 'de'
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300 ring-1 ring-rose-500/50'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Deutsch (CH - «ss»)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-medium border transition-all ${
                  language === 'en'
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300 ring-1 ring-rose-500/50'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Scene Location */}
          <div className="space-y-1">
            <label className="block font-medium text-zinc-200 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-rose-400" />
              <span>Aktueller Schauplatz & Szenenort</span>
            </label>
            <textarea
              rows={2}
              value={currentScene}
              onChange={(e) => setCurrentScene(e.target.value)}
              placeholder="z. B. Dunkle Gasse in der Bronx bei Nacht, nasser Asphalt..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 p-2.5 text-xs text-zinc-100 focus:border-rose-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Dominance Level in this chat */}
          <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
            <label className="block font-semibold text-zinc-200 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-rose-500" />
              <span>Dominanz-Level in diesem Chat</span>
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {DOMINANCE_LEVELS.map((lvl) => (
                <label
                  key={lvl.id}
                  onClick={() => setDominanceLevel(lvl.id)}
                  className={`flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-all ${
                    dominanceLevel === lvl.id
                      ? 'border-rose-500 bg-rose-950/30 text-zinc-100 ring-1 ring-rose-500/40'
                      : 'border-zinc-800/60 bg-zinc-950/50 hover:bg-zinc-800/40 text-zinc-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="dominance"
                    checked={dominanceLevel === lvl.id}
                    onChange={() => setDominanceLevel(lvl.id)}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold block text-zinc-200 text-[11px]">{lvl.label}</span>
                    <span className="text-[10px] text-zinc-400 leading-tight block">{lvl.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dynamics & Archetypes */}
          <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
            <label className="block font-semibold text-zinc-200 flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-rose-400" />
              <span>Rollen & Spiel-Dynamiken (Mehrfachauswahl)</span>
            </label>
            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
              {DYNAMICS_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {cat.items.map((item) => {
                      const isSelected = dynamics.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleDynamic(item)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-medium border transition-all ${
                            isSelected
                              ? 'border-rose-500 bg-rose-950/60 text-rose-200 font-semibold'
                              : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pacing & Plot Initiative */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-medium text-zinc-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-rose-400" />
                <span>Erzähltempo (Pacing)</span>
              </label>
              <select
                value={pacing}
                onChange={(e) => setPacing(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="slow_burn">Slow Burn (Langsamer Aufbau)</option>
                <option value="balanced">Ausgewogenes Tempo</option>
                <option value="fast">Schnellere Entwicklung</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-zinc-300 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>Plot-Initiative</span>
              </label>
              <select
                value={plotInitiative}
                onChange={(e) => setPlotInitiative(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="high">Hoch (Proaktiv Szene bewegen)</option>
                <option value="medium">Mittel (Ausgewogen)</option>
                <option value="low">Niedrig (Reaktiv/Beobachtend)</option>
              </select>
            </div>
          </div>

          {/* Humor & Flirt */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-medium text-zinc-300 flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-400" />
                <span>Eigeninitiative</span>
              </label>
              <select
                value={initiativeLevel}
                onChange={(e) => setInitiativeLevel(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="high">Hoch (sehr proaktiv)</option>
                <option value="medium">Mittel (ausgewogen)</option>
                <option value="low">Niedrig (abwartend)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-zinc-300 flex items-center gap-1">
                <Flame className="h-3 w-3 text-rose-400" />
                <span>Flirt-Verhalten</span>
              </label>
              <select
                value={flirtBehavior}
                onChange={(e) => setFlirtBehavior(e.target.value as any)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="intense">Intensiv & fordernd</option>
                <option value="playful">Spielerisch & neckend</option>
                <option value="subtle">Subtil & verhalten</option>
                <option value="none">Kein Flirt / sachlich</option>
              </select>
            </div>
          </div>

          {/* Humor Styles */}
          <div className="space-y-1.5">
            <label className="block font-medium text-zinc-300 flex items-center gap-1">
              <Smile className="h-3 w-3 text-emerald-400" />
              <span>Humorstile in diesem Chat</span>
            </label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {HUMOR_STYLES_LIST.map((style) => {
                const isSelected = humorStyles.includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleHumorStyle(style)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] border transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-950/50 text-rose-200 font-medium'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/90 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-rose-500 transition-all active:scale-95"
          >
            {saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-300" />
                <span>Gespeichert!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Einstellungen speichern</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
