import React, { useState } from 'react';
import { Character, ChatSession } from '../types';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Calendar,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  MoreVertical,
  Edit2
} from 'lucide-react';

interface ChatListViewProps {
  characters: Character[];
  chats: ChatSession[];
  activeChatId: string;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (characterId: string, customTitle?: string, language?: 'de' | 'en', initialMessage?: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onNavigateToCharacters: () => void;
}

export const ChatListView: React.FC<ChatListViewProps> = ({
  characters,
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onRenameChat,
  onNavigateToCharacters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState(characters[0]?.id || 'char-dean');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatLang, setNewChatLang] = useState<'de' | 'en'>('de');
  const [includeStartPrompt, setIncludeStartPrompt] = useState(true);

  // Filter chats by query or character name
  const filteredChats = chats.filter((chat) => {
    const char = characters.find((c) => c.id === chat.characterId);
    const charName = char?.name || '';
    const q = searchQuery.toLowerCase();
    return (
      chat.title.toLowerCase().includes(q) ||
      charName.toLowerCase().includes(q) ||
      chat.currentScene?.toLowerCase().includes(q)
    );
  });

  const handleStartNewChat = () => {
    const char = characters.find((c) => c.id === selectedCharId);
    const initialMsg = includeStartPrompt && char?.startPrompt ? char.startPrompt : undefined;
    onCreateChat(selectedCharId, newChatTitle.trim() || undefined, newChatLang, initialMsg);
    setIsCreateModalOpen(false);
    setNewChatTitle('');
  };

  const getCharacterForChat = (chat: ChatSession) => {
    return characters.find((c) => c.id === chat.characterId) || characters[0];
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3.5 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">Meine Chats</span>
          </h1>
          <p className="text-[11px] text-zinc-400">
            {chats.length} {chats.length === 1 ? 'aktive Unterhaltung' : 'aktive Unterhaltungen'}
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition-all hover:from-rose-500 hover:to-rose-600 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Neuer Chat</span>
        </button>
      </div>

      {/* Quick Character Bar */}
      <div className="border-b border-zinc-900 bg-zinc-900/30 px-4 py-2.5">
        <div className="flex items-center justify-between pb-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Charaktere für Schnellstart
          </span>
          <button
            onClick={onNavigateToCharacters}
            className="text-[11px] text-rose-400 hover:underline flex items-center gap-0.5"
          >
            Alle verwalten <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none">
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => {
                setSelectedCharId(char.id);
                setIsCreateModalOpen(true);
              }}
              className="flex flex-col items-center gap-1 min-w-[58px] group transition-transform active:scale-95"
            >
              <div className="relative">
                <img
                  src={char.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
                  alt={char.name}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-800 group-hover:ring-rose-500 transition-all shadow"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
              </div>
              <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white truncate max-w-[64px]">
                {char.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-zinc-900">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Chats und Szenen durchsuchen..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Chat List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
            <MessageSquare className="h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-sm font-medium text-zinc-400">Keine Chats gefunden</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">
              Erstelle eine neue Session mit Dean oder einem deiner anderen Charaktere.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              Jetzt Chat starten
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const char = getCharacterForChat(chat);
            const lastMsg = chat.messages[chat.messages.length - 1];
            const isSelected = chat.id === activeChatId;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group flex items-center justify-between rounded-2xl p-3 transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-rose-500/40 bg-zinc-900/90 shadow-lg'
                    : 'border-zinc-900/80 bg-zinc-950/40 hover:border-zinc-800 hover:bg-zinc-900/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={char?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
                      alt={char?.name || 'Charakter'}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-2xl object-cover ring-1 ring-zinc-700 shadow"
                    />
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-zinc-900 px-1 py-0.2 text-[9px] font-bold text-rose-400 border border-zinc-800">
                      {chat.language.toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-rose-400 transition-colors">
                        {chat.title}
                      </h3>
                      <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                        {formatTimestamp(chat.updatedAt || chat.createdAt)}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span className="font-medium text-rose-400/90">{char?.name}:</span>
                      <p className="truncate text-zinc-400 text-[11px]">
                        {lastMsg ? lastMsg.content.replace(/\*/g, '') : 'Neuer Chat bereit...'}
                      </p>
                    </div>

                    {chat.currentScene && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 truncate">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500/80" />
                        <span className="truncate">{chat.currentScene}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt('Neuen Titel für diesen Chat eingeben:', chat.title);
                      if (newTitle && newTitle.trim()) {
                        onRenameChat(chat.id, newTitle.trim());
                      }
                    }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                    title="Umbenennen"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Möchtest du den Chat "${chat.title}" wirklich löschen?`)) {
                        onDeleteChat(chat.id);
                      }
                    }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-950 hover:text-rose-400"
                    title="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Neuer Chat erstellen */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-rose-400" />
                Neuen Chat starten
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900"
              >
                ✕
              </button>
            </div>

            {/* Character selection */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">Charakter auswählen</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {characters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCharId(c.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                      selectedCharId === c.id
                        ? 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/50'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <img
                      src={c.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
                      alt={c.name}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-100 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{c.dominanceLevel || 'dominant'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Title */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Titel des Chats (Optional)</label>
              <input
                type="text"
                value={newChatTitle}
                onChange={(e) => setNewChatTitle(e.target.value)}
                placeholder="z. B. Bronx-Duplex – Dunkle Nacht"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-zinc-100 focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Sprache</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewChatLang('de')}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all ${
                    newChatLang === 'de'
                      ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  Deutsch (CH)
                </button>
                <button
                  type="button"
                  onClick={() => setNewChatLang('en')}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all ${
                    newChatLang === 'en'
                      ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Option to load Start Prompt */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStartPrompt}
                  onChange={(e) => setIncludeStartPrompt(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500"
                />
                <span>Start-Prompt des Charakters als erste Nachricht laden</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleStartNewChat}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-rose-500"
              >
                Chat öffnen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
