import React from 'react';
import { Character, ChatSession } from '../types';
import {
  Menu,
  X,
  Users,
  MessageSquare,
  BookOpen,
  Camera,
  Settings,
  Download,
  Activity,
  Globe,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Shield,
  Heart,
  Eye
} from 'lucide-react';

interface ChatMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  activeChat: ChatSession;
  onNavigateToChats: () => void;
  onNavigateToCharacters: () => void;
  onOpenContextModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenImportExportModal: () => void;
  onOpenDiagnosticsModal: () => void;
  onOpenCharacterEditor: () => void;
  onOpenProfileModal: () => void;
  onRequestPhoto: () => void;
  onToggleLanguage: () => void;
  onRenameChat: (newTitle: string) => void;
  onClearChatHistory: () => void;
  onCreateNewChat: () => void;
  isGenerating: boolean;
  hasErrors?: boolean;
}

export const ChatMenuDrawer: React.FC<ChatMenuDrawerProps> = ({
  isOpen,
  onClose,
  character,
  activeChat,
  onNavigateToChats,
  onNavigateToCharacters,
  onOpenContextModal,
  onOpenSettingsModal,
  onOpenImportExportModal,
  onOpenDiagnosticsModal,
  onOpenCharacterEditor,
  onOpenProfileModal,
  onRequestPhoto,
  onToggleLanguage,
  onRenameChat,
  onClearChatHistory,
  onCreateNewChat,
  isGenerating,
  hasErrors = false,
}) => {
  if (!isOpen) return null;

  const isGerman = activeChat.language === 'de';

  return (
    <div
      id="chat-menu-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="chat-menu-drawer-content"
        className="flex h-full w-full max-w-xs flex-col border-l border-zinc-800 bg-zinc-950 p-4 shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Menu className="h-5 w-5 text-rose-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Chat-Menü & Aktionen</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable menu items */}
        <div className="flex-1 space-y-4 overflow-y-auto py-3 text-xs">
          {/* Active Character Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center gap-3">
              <img
                src={character.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-xl object-cover ring-1 ring-zinc-700 shadow"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-zinc-100 truncate">{character.name}</h3>
                  <span className="rounded bg-rose-950 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                    {character.dominanceLevel || 'dominant'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Anrede: <span className="text-zinc-200 font-medium">{character.playerAddressName || 'Lidii'}</span>
                </p>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-2 border-t border-zinc-800/80">
              <button
                onClick={() => {
                  onClose();
                  onOpenProfileModal();
                }}
                className="flex items-center justify-center gap-1 rounded-lg bg-zinc-800/80 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700"
              >
                <Eye className="h-3.5 w-3.5 text-rose-400" />
                <span>Steckbrief</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenCharacterEditor();
                }}
                className="flex items-center justify-center gap-1 rounded-lg bg-zinc-800/80 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700"
              >
                <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                <span>Bearbeiten</span>
              </button>
            </div>
          </div>

          {/* Special Action: Request Photo */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-rose-400" />
                Foto anfordern
              </span>
              <span className="text-[10px] text-rose-400/80 uppercase font-semibold">Situativ</span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2.5">
              Lass {character.name} ein passendes Foto (Spiegel-Selfie, Outfit, Umgebung) in den aktuellen Chat senden.
            </p>
            <button
              onClick={() => {
                onClose();
                onRequestPhoto();
              }}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 py-2 text-xs font-semibold text-white shadow hover:from-rose-500 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Foto jetzt senden lassen</span>
            </button>
          </div>

          {/* Story & Scene Section */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
              Szene & Gedächtnis
            </span>
            <button
              onClick={() => {
                onClose();
                onOpenContextModal();
              }}
              className="flex w-full items-center justify-between rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-rose-400" />
                <div className="text-left">
                  <p className="font-medium text-zinc-200">Szene & Story-Kontext</p>
                  <p className="text-[10px] text-zinc-500 truncate max-w-[170px]">
                    {activeChat.currentScene || 'Ort & Ereignisse anpassen'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Chat Options */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
              Aktueller Chat: "{activeChat.title}"
            </span>

            {/* Language switch */}
            <button
              onClick={onToggleLanguage}
              className="flex w-full items-center justify-between rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-rose-400" />
                <span>Sprache wechseln</span>
              </div>
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-bold text-rose-300 text-[10px]">
                {isGerman ? 'DE (Schweiz)' : 'EN'}
              </span>
            </button>

            {/* Rename chat */}
            <button
              onClick={() => {
                const newTitle = prompt('Neuen Titel für diesen Chat eingeben:', activeChat.title);
                if (newTitle && newTitle.trim()) {
                  onRenameChat(newTitle.trim());
                }
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <Edit2 className="h-4 w-4 text-zinc-400" />
              <span>Chat umbenennen</span>
            </button>

            {/* New chat */}
            <button
              onClick={() => {
                onClose();
                onCreateNewChat();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <Plus className="h-4 w-4 text-rose-400" />
              <span>Neuen Chat mit {character.name} starten</span>
            </button>

            {/* Clear messages */}
            <button
              onClick={() => {
                if (confirm(`Verlauf von "${activeChat.title}" wirklich leeren?`)) {
                  onClearChatHistory();
                  onClose();
                }
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-rose-400/90 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4 text-rose-400" />
              <span>Verlauf leeren</span>
            </button>
          </div>

          {/* App-Wide Tools */}
          <div className="space-y-1 border-t border-zinc-800/80 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
              Verwaltung & System
            </span>

            <button
              onClick={() => {
                onClose();
                onNavigateToChats();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-rose-400" />
              <span>Alle Chats anzeigen</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onNavigateToCharacters();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <Users className="h-4 w-4 text-rose-400" />
              <span>Charakter-Übersicht</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenImportExportModal();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <Download className="h-4 w-4 text-zinc-400" />
              <span>Import / Export / Backup</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenDiagnosticsModal();
              }}
              className="flex w-full items-center justify-between rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-zinc-400" />
                <span>Diagnose & Logs</span>
              </div>
              {hasErrors && <span className="h-2 w-2 rounded-full bg-rose-500" />}
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenSettingsModal();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <Settings className="h-4 w-4 text-zinc-400" />
              <span>Modell-Einstellungen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
