import React from 'react';
import { Character, ChatSession } from '../types';
import {
  Menu,
  ChevronLeft,
  Globe,
  BookOpen
} from 'lucide-react';

interface HeaderProps {
  character: Character;
  activeChat: ChatSession;
  onBackToChats: () => void;
  onOpenProfileModal: () => void;
  onOpenMenuDrawer: () => void;
  onRequestPhoto?: () => void;
  onToggleChatLanguage: () => void;
  onOpenContext: () => void;
  isGenerating: boolean;
  hasErrors?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  character,
  activeChat,
  onBackToChats,
  onOpenProfileModal,
  onOpenMenuDrawer,
  onToggleChatLanguage,
  onOpenContext,
  isGenerating,
  hasErrors = false,
}) => {
  const isGerman = activeChat.language === 'de';

  const formatDominance = (lvl?: string) => {
    switch (lvl) {
      case 'level_1_very_restrained': return 'Sehr zurückhaltend';
      case 'level_2_gentle': return 'Sanft';
      case 'level_3_lightly_leading': return 'Leicht führend';
      case 'level_4_confident': return 'Selbstbewusst';
      case 'level_5_dominant': return 'Dominant';
      case 'level_6_strongly_dominant': return 'Stark dominant';
      case 'level_7_controlling': return 'Kontrollierend';
      case 'level_8_very_controlling': return 'Sehr kontrollierend';
      case 'level_9_extremely_dominant': return 'Extrem dominant';
      case 'restrained': return 'Zurückhaltend';
      case 'submissive': return 'Unterwürfig';
      case 'balanced': return 'Ausgewogen';
      case 'dominant': return 'Dominant';
      default: return '';
    }
  };

  const dominanceLabel = formatDominance(character.dominanceLevel);

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/95 px-2.5 sm:px-4 py-2.5 backdrop-blur-md"
    >
      {/* Left: Back button & Character Profile Info */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <button
          id="header-back-to-chats"
          onClick={onBackToChats}
          className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
          title="Zurück zur Chat-Übersicht"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Character clickable Profile Trigger */}
        <button
          id="characters-header-profile-btn"
          onClick={onOpenProfileModal}
          className="flex items-center gap-2.5 rounded-xl p-1 text-left transition-all hover:bg-zinc-900/80 active:scale-98 min-w-0"
          title="Charakter-Steckbrief & Details anzeigen"
        >
          <div className="relative shrink-0">
            {character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-700 shadow"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-100 ring-2 ring-zinc-700">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${
                isGenerating
                  ? 'animate-ping bg-amber-400'
                  : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
              }`}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-zinc-100 truncate max-w-[120px] sm:max-w-[190px]">
                {character.name}
              </span>
              {dominanceLabel && (
                <span className="hidden xs:inline rounded bg-rose-950/60 px-1.5 py-0.5 text-[9px] font-semibold text-rose-300 ring-1 ring-rose-500/20">
                  {dominanceLabel}
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 truncate max-w-[130px] sm:max-w-[200px]">
              {isGenerating ? `${character.name} schreibt …` : `${activeChat.title} ▾`}
            </span>
          </div>
        </button>
      </div>

      {/* Right: Language, Context & Hamburger Drawer Menu */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Quick Language Toggle */}
        <button
          id="toggle-language-btn"
          onClick={onToggleChatLanguage}
          className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
          title={`Sprache für diesen Chat: ${isGerman ? 'Deutsch' : 'English'}`}
        >
          <Globe className="h-3.5 w-3.5 text-rose-400" />
          <span>{isGerman ? 'DE' : 'EN'}</span>
        </button>

        {/* Context quick icon */}
        <button
          onClick={onOpenContext}
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Szene & Story-Kontext"
        >
          <BookOpen className="h-4 w-4" />
        </button>

        {/* Hamburger Menu Trigger */}
        <button
          id="header-menu-drawer-btn"
          onClick={onOpenMenuDrawer}
          className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          title="Chat-Menü & Optionen öffnen"
        >
          <Menu className="h-4 w-4" />
          {hasErrors && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </button>
      </div>
    </header>
  );
};
