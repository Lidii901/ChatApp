import React, { useState } from 'react';
import { Character, ChatSession } from '../types';
import {
  Menu,
  X,
  BookOpen,
  Sparkles,
  Globe,
  Trash2,
  Edit2,
  Eye,
  Sliders
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ChatSettingsModal } from './ChatSettingsModal';

interface ChatMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  baseCharacter: Character;
  activeChat: ChatSession;
  onOpenContextModal: () => void;
  onOpenCharacterEditor: () => void;
  onOpenProfileModal: () => void;
  onRequestPhoto: () => void;
  onToggleLanguage: () => void;
  onUpdateChat: (updatedChat: ChatSession) => void;
  onClearChatHistory: () => void;
  onDeleteChat?: () => void;
  isGenerating: boolean;
}

export const ChatMenuDrawer: React.FC<ChatMenuDrawerProps> = ({
  isOpen,
  onClose,
  character,
  baseCharacter,
  activeChat,
  onOpenContextModal,
  onOpenCharacterEditor,
  onOpenProfileModal,
  onRequestPhoto,
  onToggleLanguage,
  onUpdateChat,
  onClearChatHistory,
  onDeleteChat,
  isGenerating,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);

  if (!isOpen) return null;

  const isGerman = activeChat.language === 'de';

  return (
    <>
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
              <h2 className="text-sm font-semibold text-zinc-100">Optionen für diesen Chat</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 cursor-pointer"
              title="Schliessen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu items */}
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
                  className="flex items-center justify-center gap-1 rounded-lg bg-zinc-800/80 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-rose-400" />
                  <span>Steckbrief</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenCharacterEditor();
                  }}
                  className="flex items-center justify-center gap-1 rounded-lg bg-zinc-800/80 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Bearbeiten</span>
                </button>
              </div>
            </div>

            {/* Action: Request Photo */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-rose-400" />
                  Szenenmoment
                </span>
                <span className="text-[10px] text-rose-400/80 uppercase font-semibold">Text</span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-2.5">
                Lass {character.name} eine kurze, zur aktuellen Situation passende Nachricht senden. Es wird kein Bild generiert.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onRequestPhoto();
                }}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 py-2 text-xs font-semibold text-white shadow hover:from-rose-500 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Szenenmoment senden lassen</span>
              </button>
            </div>

            {/* Scene & Story Context */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                Szene & Gedächtnis
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenContextModal();
                }}
                className="flex w-full items-center justify-between rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors border border-zinc-800/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-rose-400 shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-zinc-200">Szene & Story-Kontext</p>
                    <p className="text-[10px] text-zinc-500 truncate max-w-[170px]">
                      {activeChat.storyContext?.currentScene || 'Ort & Schauplatz anpassen'}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Chat Settings */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                Chat-Einstellungen & Rollen
              </span>

              {/* Configure Chat & Roles */}
              <button
                onClick={() => {
                  setIsChatSettingsOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors border border-zinc-800/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="h-4 w-4 text-rose-400" />
                  <div className="text-left">
                    <p className="font-medium text-zinc-200">Chat konfigurieren</p>
                    <p className="text-[10px] text-zinc-500">Character Overrides, Sprache & Memory für diesen Chat</p>
                  </div>
                </div>
              </button>

              {/* Language switch */}
              <button
                onClick={onToggleLanguage}
                className="flex w-full items-center justify-between rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors border border-zinc-800/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-rose-400" />
                  <span>Sprache wechseln</span>
                </div>
                <span className="rounded bg-zinc-800 px-2 py-0.5 font-bold text-rose-300 text-[10px]">
                  {isGerman ? 'DE (CH)' : 'EN'}
                </span>
              </button>

              {/* Clear messages */}
              <button
                onClick={() => {
                  setIsClearHistoryOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-zinc-300 hover:bg-zinc-900 transition-colors border border-zinc-800/60 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 text-amber-400" />
                <span>Verlauf leeren</span>
              </button>

              {/* Delete entire chat */}
              {onDeleteChat && (
                <button
                  onClick={() => {
                    setIsDeleteDialogOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-rose-400 hover:bg-rose-950/40 transition-colors border border-rose-900/40 font-semibold cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  <span>Chat löschen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Chat Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          onClose();
          if (onDeleteChat) onDeleteChat();
        }}
        title="Chat löschen"
        itemName={activeChat.title}
        message={`Möchtest du den gesamten Chat "${activeChat.title}" wirklich endgültig löschen?`}
      />

      {/* Clear History Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isClearHistoryOpen}
        onClose={() => setIsClearHistoryOpen(false)}
        onConfirm={() => {
          setIsClearHistoryOpen(false);
          onClearChatHistory();
          onClose();
        }}
        title="Nachrichtenverlauf leeren"
        itemName={activeChat.title}
        message={`Möchtest du alle Nachrichten in "${activeChat.title}" löschen? Der Schauplatz und die Einstellungen bleiben erhalten.`}
      />

      {/* Chat Settings Modal */}
      {isChatSettingsOpen && (
        <ChatSettingsModal
          isOpen={isChatSettingsOpen}
          onClose={() => setIsChatSettingsOpen(false)}
          chat={activeChat}
          baseCharacter={baseCharacter}
          onSaveChat={(updated) => {
            onUpdateChat(updated);
            setIsChatSettingsOpen(false);
          }}
        />
      )}
    </>
  );
};
