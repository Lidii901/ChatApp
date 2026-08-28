import React, { useMemo, useState } from 'react';
import { Character, ChatSession } from '../types';
import {
  ChevronRight,
  Globe2,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ChatSettingsModal } from './ChatSettingsModal';

interface ChatListViewProps {
  characters: Character[];
  chats: ChatSession[];
  activeChatId: string;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (
    characterId: string,
    customTitle?: string,
    language?: 'de' | 'en',
    selectedGreeting?: string,
  ) => void | Promise<void>;
  onDeleteChat: (chatId: string) => void;
  onUpdateChat: (updatedChat: ChatSession) => void;
  onNavigateToCharacters: () => void;
}

const fallbackAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

function cardGreeting(character: Character): string {
  return character.firstMes !== undefined ? character.firstMes : character.startPrompt || '';
}

function previewGreeting(text: string, character: Character): string {
  return (text || '')
    .replace(/{{char}}/gi, character.name || 'Character')
    .replace(/{{user}}/gi, character.playerAddressName || 'User');
}

export const ChatListView: React.FC<ChatListViewProps> = ({
  characters,
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onUpdateChat,
  onNavigateToCharacters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState(characters[0]?.id || '');
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatLang, setNewChatLang] = useState<'de' | 'en'>('de');
  const [selectedGreetingIndex, setSelectedGreetingIndex] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
  const [chatToEdit, setChatToEdit] = useState<ChatSession | null>(null);

  const selectedChar = characters.find(c => c.id === selectedCharId) || characters[0];

  const availableGreetings = useMemo(() => {
    if (!selectedChar) return [];
    const result: string[] = [];
    const primary = cardGreeting(selectedChar);
    if (primary.trim()) result.push(primary);
    (selectedChar.alternateGreetings || []).forEach(greeting => {
      if (typeof greeting === 'string' && greeting.trim() && !result.includes(greeting)) result.push(greeting);
    });
    return result;
  }, [selectedChar]);

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? chats.filter(chat => {
          const character = characters.find(c => c.id === chat.characterId);
          return [chat.title, character?.name, chat.storyContext?.currentScene]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(q));
        })
      : chats;
    return [...list].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [chats, characters, searchQuery]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    return date.toDateString() === today.toDateString()
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const openNewChat = (characterId?: string) => {
    setSelectedCharId(characterId || characters[0]?.id || '');
    setSelectedGreetingIndex(0);
    setNewChatTitle('');
    setIsCreateModalOpen(true);
  };

  const handleStartNewChat = async () => {
    if (!selectedChar || isStarting) return;
    setIsStarting(true);
    try {
      const chosenGreeting = availableGreetings[selectedGreetingIndex] ?? availableGreetings[0];
      await onCreateChat(
        selectedChar.id,
        newChatTitle.trim() || undefined,
        newChatLang,
        chosenGreeting,
      );
      setIsCreateModalOpen(false);
      setNewChatTitle('');
      setSelectedGreetingIndex(0);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#09090b] text-zinc-100">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-400/80">Deine Storys</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Chats</h1>
          </div>
          <button
            onClick={onNavigateToCharacters}
            className="mb-1 flex items-center gap-1 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            Charaktere <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-zinc-900/80 pb-4">
        <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-none">
          {characters.map(character => (
            <button
              key={character.id}
              onClick={() => openNewChat(character.id)}
              className="group relative h-36 w-24 shrink-0 overflow-hidden rounded-[22px] bg-zinc-900 text-left shadow-lg active:scale-[0.98]"
            >
              <img
                src={character.avatarUrl || fallbackAvatar}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="truncate text-sm font-bold text-white">{character.name}</p>
                <p className="mt-0.5 text-[10px] text-zinc-300">Neue Story</p>
              </div>
              <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                <Plus className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Chats durchsuchen"
            className="h-12 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/70 pl-11 pr-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-rose-500/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {filteredChats.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-8 text-center">
            <MessageCircle className="h-10 w-10 text-zinc-700" />
            <h2 className="mt-4 text-base font-bold text-zinc-200">Noch keine Story hier</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">Starte oben einen Chat mit einem Charakter.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map(chat => {
              const character = characters.find(c => c.id === chat.characterId) || characters[0];
              const lastMessage = chat.messages[chat.messages.length - 1];
              const active = chat.id === activeChatId;
              const menuOpen = openMenuChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`relative flex items-center gap-3 rounded-[22px] px-3 py-3 transition-colors ${active ? 'bg-rose-950/20' : 'hover:bg-zinc-900/55'}`}
                >
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={character?.avatarUrl || fallbackAvatar}
                        alt={character?.name || 'Character'}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 rounded-full object-cover ring-1 ring-zinc-800"
                      />
                      <span className="absolute bottom-0 right-0 rounded-full border-2 border-[#09090b] bg-zinc-800 px-1.5 py-0.5 text-[9px] font-black text-rose-300">
                        {chat.language.toUpperCase()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 border-b border-zinc-900/80 pb-3 pt-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="truncate text-[15px] font-bold text-zinc-100">{chat.title}</h3>
                        <span className="shrink-0 text-[10px] text-zinc-600">{formatTimestamp(chat.updatedAt || chat.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-rose-400/85">{character?.name || 'Character'}</p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {lastMessage ? lastMessage.content.replace(/\*/g, '').replace(/\s+/g, ' ') : 'Neue Unterhaltung'}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setOpenMenuChatId(menuOpen ? null : chat.id)}
                    className="rounded-full p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                    aria-label="Chat-Menü"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-3 top-14 z-20 w-44 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl">
                      <button
                        onClick={() => {
                          setChatToEdit(chat);
                          setOpenMenuChatId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                      >
                        <Settings2 className="h-4 w-4" /> Chat-Einstellungen
                      </button>
                      <button
                        onClick={() => {
                          setChatToDelete(chat);
                          setOpenMenuChatId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-4 w-4" /> Chat löschen
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => openNewChat()}
        className="absolute bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-[0_12px_35px_rgba(225,29,72,0.35)] transition-transform active:scale-95"
        aria-label="Neuer Chat"
      >
        <Plus className="h-6 w-6" />
      </button>

      {isCreateModalOpen && selectedChar && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[30px] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:max-w-md sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedChar.avatarUrl || fallbackAvatar}
                  alt={selectedChar.name}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-700"
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">Neue Story</p>
                  <h2 className="text-lg font-black text-white">{selectedChar.name}</h2>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="rounded-full bg-zinc-900 p-2 text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold text-zinc-300">Chatname <span className="font-normal text-zinc-600">optional</span></label>
                <input
                  value={newChatTitle}
                  onChange={event => setNewChatTitle(event.target.value)}
                  placeholder={`Chat mit ${selectedChar.name}`}
                  className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 text-sm text-zinc-100 outline-none focus:border-rose-500/60"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-300"><Globe2 className="h-4 w-4 text-rose-400" /> Sprache</label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-900/70 p-1.5">
                  {(['de', 'en'] as const).map(language => (
                    <button
                      key={language}
                      onClick={() => setNewChatLang(language)}
                      className={`rounded-xl py-2.5 text-xs font-black transition-colors ${newChatLang === language ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
                    >
                      {language === 'de' ? 'Deutsch' : 'English'}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">Die Eröffnungsnachricht wird passend zur Chat-Sprache lokalisiert, ohne die gespeicherte Character Card zu verändern.</p>
              </div>

              {availableGreetings.length > 1 && (
                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-300">Greeting</label>
                  <div className="space-y-2">
                    {availableGreetings.map((greeting, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedGreetingIndex(index)}
                        className={`w-full rounded-2xl border p-3 text-left text-xs leading-relaxed ${selectedGreetingIndex === index ? 'border-rose-500/70 bg-rose-950/20 text-zinc-200' : 'border-zinc-800 bg-zinc-900/55 text-zinc-500'}`}
                      >
                        <span className="line-clamp-3">{previewGreeting(greeting, selectedChar)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled={isStarting}
                onClick={handleStartNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-50"
              >
                {isStarting ? 'Greeting wird vorbereitet …' : 'Chat starten'}
                {!isStarting && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(chatToDelete)}
        onClose={() => setChatToDelete(null)}
        onConfirm={() => chatToDelete && onDeleteChat(chatToDelete.id)}
        itemName={chatToDelete?.title || 'Chat'}
      />

      <ChatSettingsModal
        isOpen={Boolean(chatToEdit)}
        onClose={() => setChatToEdit(null)}
        chat={chatToEdit}
        baseCharacter={characters.find(c => c.id === chatToEdit?.characterId) || characters[0]}
        onSaveChat={updated => {
          onUpdateChat(updated);
          setChatToEdit(null);
        }}
      />
    </div>
  );
};
