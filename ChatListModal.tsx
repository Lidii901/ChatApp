import React, { useState } from 'react';
import { Character, ChatSession, ChatLanguage } from '../types';
import {
  MessageSquare,
  Plus,
  Trash2,
  Check,
  Globe,
  Edit2,
  Calendar,
  Sparkles
} from 'lucide-react';

interface ChatListModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  chats: ChatSession[];
  activeChatId: string;
  onSelectChat: (chatId: string) => void;
  onCreateNewChat: (title: string, language: ChatLanguage, loadStartPrompt: boolean) => void;
  onDeleteChat: (chatId: string) => void;
  onUpdateChatLanguage: (chatId: string, language: ChatLanguage) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
}

export const ChatListModal: React.FC<ChatListModalProps> = ({
  isOpen,
  onClose,
  character,
  chats,
  activeChatId,
  onSelectChat,
  onCreateNewChat,
  onDeleteChat,
  onUpdateChatLanguage,
  onRenameChat,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLanguage, setNewLanguage] = useState<ChatLanguage>('de');
  const [loadStartPrompt, setLoadStartPrompt] = useState(true);

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const characterChats = chats.filter((c) => c.characterId === character.id);

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewTitle(`Chat ${characterChats.length + 1}`);
    setNewLanguage('de');
    setLoadStartPrompt(Boolean(character.startPrompt));
  };

  const handleConfirmCreate = () => {
    const title = newTitle.trim() || `Chat ${characterChats.length + 1}`;
    onCreateNewChat(title, newLanguage, loadStartPrompt);
    setIsCreating(false);
    onClose();
  };

  const handleStartRename = (chat: ChatSession) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = (chatId: string) => {
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      id="chat-list-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Chats für {character.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* Info */}
        <p className="mt-2 text-xs text-zinc-400">
          Jeder Chat ist vollkommen unabhängig mit eigenem Verlauf, Szene und Spracheinstellung.
        </p>

        {/* Create Chat Box */}
        {isCreating ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-zinc-900/90 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-200">Neuen Chat anlegen</h3>
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">Titel des Chats</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="z. B. Die Jagd, Bibliothek, Neue Story..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-100 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">Sprache für diesen Chat</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setNewLanguage('de')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-medium transition-colors ${
                    newLanguage === 'de'
                      ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Deutsch (ss)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewLanguage('en')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-medium transition-colors ${
                    newLanguage === 'en'
                      ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>English</span>
                </button>
              </div>
            </div>

            {character.startPrompt && (
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={loadStartPrompt}
                  onChange={(e) => setLoadStartPrompt(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-rose-600 focus:ring-rose-500"
                />
                <span>Start-Prompt von {character.name} als erste Nachricht laden</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Chat erstellen
              </button>
            </div>
          </div>
        ) : null}

        {/* Chat List */}
        <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {characterChats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-zinc-500 text-xs">
              Keine Chats für {character.name} vorhanden.
            </div>
          ) : (
            characterChats.map((chat) => {
              const isSelected = chat.id === activeChatId;
              const isEditing = editingChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-rose-500/50 bg-gradient-to-r from-zinc-900 via-zinc-900 to-rose-950/20 ring-1 ring-rose-500/30'
                      : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Chat Title & Selector */}
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 p-1.5 text-xs text-zinc-100 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(chat.id)}
                          className="rounded bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setEditingChatId(null)}
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                        >
                          Abbr.
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          onSelectChat(chat.id);
                          onClose();
                        }}
                        className="flex flex-1 cursor-pointer items-center gap-2.5"
                      >
                        <span className="font-semibold text-xs text-zinc-100 hover:text-rose-300 transition-colors">
                          {chat.title}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium text-rose-300 ring-1 ring-rose-500/30">
                            <Check className="h-3 w-3" /> Offen
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Language Switcher Badge */}
                      <button
                        onClick={() => onUpdateChatLanguage(chat.id, chat.language === 'de' ? 'en' : 'de')}
                        title="Sprache für diesen Chat wechseln"
                        className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-zinc-700 hover:text-white"
                      >
                        <Globe className="h-3 w-3 text-rose-400" />
                        <span className="uppercase">{chat.language || 'de'}</span>
                      </button>

                      {!isEditing && (
                        <button
                          onClick={() => handleStartRename(chat)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                          title="Chat umbenennen"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {characterChats.length > 1 && (
                        <button
                          onClick={() => onDeleteChat(chat.id)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-rose-950 hover:text-rose-400"
                          title="Chat löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-info */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{chat.messages.length} Nachrichten</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(chat.updatedAt || chat.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-3">
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-rose-500 hover:to-rose-600"
          >
            <Plus className="h-4 w-4" />
            <span>Neuer Chat</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
};
