import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Character,
  ChatSession,
  ChatLanguage,
  Message,
  ModelSettings,
  ApiLog,
} from './types';
import {
  loadSavedCharacters,
  saveCharacters,
  loadActiveCharacterId,
  saveActiveCharacterId,
  loadSavedChats,
  saveChats,
  loadActiveChatId,
  saveActiveChatId,
  loadSavedSettings,
  saveSettings,
  loadSavedLogs,
  saveLogs,
  loadPendingJobs,
  addPendingJob,
  removePendingJob,
  getEffectiveCharacter,
} from './utils/contextManager';
import { normalizeLegacyCharacterToV2 } from './utils/characterNormalizer';
import { DEFAULT_CHARACTERS, DEFAULT_CHATS } from './data/defaultCharacters';
import { Header } from './components/Header';
import { Navigation, MainTab } from './components/Navigation';
import { ChatListView } from './components/ChatListView';
import { CharacterListView } from './components/CharacterListView';
import { SettingsHomeView } from './components/SettingsHomeView';
import { ChatMenuDrawer } from './components/ChatMenuDrawer';
import { ChatMessage } from './components/ChatMessage';
import { TypingIndicator } from './components/TypingIndicator';
import { ChatInput } from './components/ChatInput';
import { ProfileModal } from './components/ProfileModal';
import { CharacterEditorModal } from './components/CharacterEditorModal';
import { StoryContextModal } from './components/StoryContextModal';
import { SettingsModal } from './components/SettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { ArrowDown, AlertCircle } from 'lucide-react';

const greetingLocalizationCache = new Map<string, string>();

async function localizeGreetingForChat(greeting: string, language: 'de' | 'en'): Promise<string> {
  if (!greeting.trim()) return '';

  const cacheKey = `${language}:${greeting}`;
  const cached = greetingLocalizationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const response = await fetch('/api/localize-greeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ greeting, language }),
  });

  const data = await response.json();
  if (!response.ok || data.error || !data.content) {
    throw new Error(data.error || 'Greeting localization failed.');
  }

  const localized = String(data.content).trim();
  greetingLocalizationCache.set(cacheKey, localized);
  return localized;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [currentView, setCurrentView] = useState<'chat' | 'main'>('main');

  const [characters, setCharacters] = useState<Character[]>(loadSavedCharacters);
  const [activeCharacterId, setActiveCharacterId] = useState<string>(() =>
    loadActiveCharacterId(characters)
  );

  const [chats, setChats] = useState<ChatSession[]>(loadSavedChats);
  const [activeChatId, setActiveChatId] = useState<string>(() =>
    loadActiveChatId(chats, activeCharacterId)
  );

  const [settings, setSettings] = useState<ModelSettings>(loadSavedSettings);
  const [logs, setLogs] = useState<ApiLog[]>(loadSavedLogs);

  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImitating, setIsImitating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPhotoJobRunning, setIsPhotoJobRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);
  const [activeImitateJobId, setActiveImitateJobId] = useState<string | null>(null);
  const [activePhotoJobId, setActivePhotoJobId] = useState<string | null>(null);

  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);

  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const [serverStatus, setServerStatus] = useState<{
    status: string;
    defaultProvider?: string;
    chatModel?: string;
    imitateModel?: string;
    hasKey?: boolean;
  } | null>(null);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const baseCharacter = useMemo(() => {
    return (
      characters.find((c) => c.id === activeCharacterId) ||
      characters[0] ||
      normalizeLegacyCharacterToV2(DEFAULT_CHARACTERS[0])
    );
  }, [characters, activeCharacterId]);

  const activeChat = useMemo(() => {
    const chat = chats.find((c) => c.id === activeChatId && c.characterId === baseCharacter.id);
    if (chat) return chat;
    const firstCharChat = chats.find((c) => c.characterId === baseCharacter.id);
    if (firstCharChat) return firstCharChat;
    return {
      id: `chat-${baseCharacter.id}-1`,
      characterId: baseCharacter.id,
      title: 'Hauptchat',
      language: 'de' as ChatLanguage,
      messages: [],
      storyContext: {
        currentScene: 'Ein ruhiger, geschützter Raum.',
        sceneSummary: '',
        keyEvents: [],
        memories: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [chats, activeChatId, baseCharacter]);

  const activeCharacter = useMemo(() => {
    return getEffectiveCharacter(baseCharacter, activeChat);
  }, [baseCharacter, activeChat]);

  useEffect(() => saveCharacters(characters), [characters]);
  useEffect(() => saveActiveCharacterId(activeCharacterId), [activeCharacterId]);
  useEffect(() => saveChats(chats), [chats]);
  useEffect(() => saveActiveChatId(activeChatId), [activeChatId]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveLogs(logs), [logs]);

  useEffect(() => {
    fetch('/api/config')
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setServerStatus(data);
      })
      .catch((err) => console.warn('Server config error', err));

    // Restore only jobs that belong to the chat currently being shown.
    // Jobs from other chats stay persisted and can be resumed when that chat is opened.
    const pendingJobs = loadPendingJobs().filter((job) => job.chatId === activeChatId);
    if (pendingJobs.length > 0) {
      const chatJob = pendingJobs.find((j) => j.type === 'chat' || j.type === 'start-chat');
      if (chatJob) setActiveChatJobId(chatJob.id);

      const imitateJob = pendingJobs.find((j) => j.type === 'imitate');
      if (imitateJob) setActiveImitateJobId(imitateJob.id);

      const photoJob = pendingJobs.find((j) => j.type === 'photo');
      if (photoJob) setActivePhotoJobId(photoJob.id);

      setIsImitating(Boolean(imitateJob));
      setIsPhotoJobRunning(Boolean(photoJob));
      setIsGenerating(Boolean(chatJob || photoJob));
    }
  }, []);

  useEffect(() => {
    if (currentView === 'chat') scrollToBottom('auto');
  }, [activeChatId, activeChat.messages.length, currentView]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 180);
  };

  const addLog = (newLog: Omit<ApiLog, 'id' | 'timestamp'>) => {
    const logItem: ApiLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...newLog,
    };
    setLogs((prev) => [...prev, logItem]);
  };

  const updateCurrentChat = (updater: (prevChat: ChatSession) => ChatSession) => {
    setChats((prevChats) => {
      const idx = prevChats.findIndex((c) => c.id === activeChat.id);
      if (idx === -1) return [...prevChats, updater(activeChat)];
      const newChats = [...prevChats];
      newChats[idx] = updater(newChats[idx]);
      return newChats;
    });
  };

  const restorePendingStateForChat = (chatId: string) => {
    const pendingJobs = loadPendingJobs().filter((job) => job.chatId === chatId);
    const chatJob = pendingJobs.find((job) => job.type === 'chat' || job.type === 'start-chat');
    const imitateJob = pendingJobs.find((job) => job.type === 'imitate');
    const photoJob = pendingJobs.find((job) => job.type === 'photo');

    setActiveChatJobId(chatJob?.id ?? null);
    setActiveImitateJobId(imitateJob?.id ?? null);
    setActivePhotoJobId(photoJob?.id ?? null);
    setIsImitating(Boolean(imitateJob));
    setIsPhotoJobRunning(Boolean(photoJob));
    setIsGenerating(Boolean(chatJob || photoJob));
  };

  const handleOpenChat = (chatId: string) => {
    const targetChat = chats.find((c) => c.id === chatId);
    if (targetChat) {
      restorePendingStateForChat(targetChat.id);
      setActiveCharacterId(targetChat.characterId);
      setActiveChatId(targetChat.id);
      setCurrentView('chat');
    }
  };

  const handleSelectCharacterToChat = (charId: string) => {
    setActiveCharacterId(charId);
    const existing = chats.filter((c) => c.characterId === charId);
    if (existing.length > 0) {
      handleOpenChat(existing[0].id);
    } else {
      void handleCreateNewChat(charId, undefined, activeChat?.language || 'de');
    }
  };

  const handleCreateNewChat = async (
    characterId: string,
    customTitle?: string,
    language: 'de' | 'en' = 'de',
    selectedGreeting?: string
  ) => {
    const storedChar = characters.find((c) => c.id === characterId) || activeCharacter;
    const char = normalizeLegacyCharacterToV2(storedChar);
    const newChatId = `chat-${char.id}-${Date.now()}`;
    const initialMsgs: Message[] = [];

    const sourceGreeting = selectedGreeting !== undefined
      ? selectedGreeting
      : char.firstMes !== undefined
      ? char.firstMes
      : char.startPrompt || '';

    let firstGreeting = '';
    if (sourceGreeting) {
      try {
        firstGreeting = await localizeGreetingForChat(sourceGreeting, language);
      } catch (error) {
        console.warn('Could not localize first_mes; using language-aware generated opening instead.', error);
      }
    }

    if (firstGreeting) {
      const resolvedGreeting = firstGreeting
        .replace(/{{char}}/gi, char.name || 'Character')
        .replace(/{{user}}/gi, char.playerAddressName || 'User');

      initialMsgs.push({
        id: `msg-${Date.now()}`,
        role: char.id === 'char-dean' ? 'dean' : 'character',
        content: resolvedGreeting,
        timestamp: Date.now(),
        speakerName: char.name,
      });
    }

    const cardScenario = char.scenario !== undefined ? char.scenario : char.startPlot;
    const startScenePlot = cardScenario || (language === 'en' ? 'The beginning of a new scene.' : 'Der Beginn einer neuen Szene.');

    const newChat: ChatSession = {
      id: newChatId,
      characterId: char.id,
      title: customTitle || `Chat mit ${char.name} #${chats.filter((c) => c.characterId === char.id).length + 1}`,
      language,
      messages: initialMsgs,
      storyContext: {
        currentScene: startScenePlot,
        sceneSummary: '',
        keyEvents: [],
        memories: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setChats((prev) => [...prev, newChat]);

    // A job from the previously open chat must never make a fresh chat appear to be
    // generating. Keep other-chat jobs persisted, but detach their UI state here.
    setActiveChatJobId(null);
    setActiveImitateJobId(null);
    setActivePhotoJobId(null);
    setIsGenerating(false);
    setIsImitating(false);
    setIsPhotoJobRunning(false);

    setActiveCharacterId(char.id);
    setActiveChatId(newChatId);
    setCurrentView('chat');

    if (!firstGreeting) {
      setIsGenerating(true);
      try {
        const response = await fetch('/api/jobs/start-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character: char,
            language,
            settings,
            characterId: char.id,
            chatId: newChatId,
            customPlot: cardScenario,
          }),
        });
        const data = await response.json();
        if (data.jobId) {
          setActiveChatJobId(data.jobId);
          addPendingJob({
            id: data.jobId,
            type: 'start-chat',
            characterId: char.id,
            chatId: newChatId,
            createdAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('Failed to trigger opening scene', err);
        setIsGenerating(false);
      }
    }
  };

  const handleDeleteChat = (chatId: string) => {
    const filtered = chats.filter((c) => c.id !== chatId);
    setChats(filtered);
    if (activeChatId === chatId) {
      if (filtered.length > 0) {
        setActiveChatId(filtered[0].id);
        setActiveCharacterId(filtered[0].characterId);
      } else {
        setActiveChatId('');
        setCurrentView('main');
        setActiveTab('chats');
      }
    }
  };

  const handleUpdateChat = (updatedChat: ChatSession) => {
    setChats((prev) => prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)));
  };

  const handleClearChatHistory = () => {
    updateCurrentChat((c) => ({ ...c, messages: [], updatedAt: Date.now() }));
  };

  const handleSaveCharacter = (savedChar: Character) => {
    const normalized = normalizeLegacyCharacterToV2(savedChar);
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === normalized.id);
      return exists
        ? prev.map((c) => (c.id === normalized.id ? normalized : c))
        : [...prev, normalized];
    });
    setActiveCharacterId(normalized.id);
    setActiveTab('characters');
    setCurrentView('main');
  };

  const handleDeleteCharacter = (charId: string) => {
    if (characters.length <= 1) {
      alert('Der letzte Charakter kann nicht gelöscht werden.');
      return;
    }
    const filteredChars = characters.filter((c) => c.id !== charId);
    setCharacters(filteredChars);
    setChats((prev) => prev.filter((c) => c.characterId !== charId));

    if (activeCharacterId === charId) {
      const nextChar = filteredChars[0];
      handleSelectCharacterToChat(nextChar.id);
    }
  };

  const handleToggleCurrentChatLanguage = () => {
    const nextLang: ChatLanguage = activeChat.language === 'de' ? 'en' : 'de';
    updateCurrentChat((c) => ({ ...c, language: nextLang, updatedAt: Date.now() }));
  };

  useEffect(() => {
    if (!activeChatJobId) return;
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeChatJobId}`);
        if (!res.ok) return;
        const job = await res.json();

        if (job.status === 'completed' && isSubscribed) {
          clearInterval(interval);
          removePendingJob(activeChatJobId);
          setActiveChatJobId(null);
          setIsGenerating(false);

          if (job.result?.content) {
            const targetChatId = job.chatId || job.metadata?.chatId || activeChat.id;
            const charObj = job.characterId
              ? characters.find((c) => c.id === job.characterId) || activeCharacter
              : activeCharacter;
            const charName = job.result.speakerName || charObj.name;
            const messageRole = (job.result.role || (charObj.id === 'char-dean' ? 'dean' : 'character')) as 'dean' | 'character';
            const newMsg: Message = {
              id: `msg-${Date.now()}`,
              role: messageRole,
              content: job.result.content,
              timestamp: Date.now(),
              speakerName: charName,
            };

            setChats((prevChats) =>
              prevChats.map((c) => c.id === targetChatId
                ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() }
                : c)
            );

            addLog({
              type: 'chat',
              status: 'success',
              model: job.result.modelUsed || settings.modelName || 'openrouter',
              latencyMs: job.result.latencyMs,
              message: `${charName} Antwort empfangen (${job.result.content.length} Zeichen)`,
            });
            setTimeout(() => scrollToBottom(), 80);
          }
        } else if ((job.status === 'failed' || job.status === 'error') && isSubscribed) {
          clearInterval(interval);
          removePendingJob(activeChatJobId);
          setActiveChatJobId(null);
          setIsGenerating(false);
          setErrorMessage(job.error || 'Fehler bei der Generierung.');
          addLog({
            type: 'error',
            status: 'error',
            model: settings.modelName || 'openrouter',
            message: job.error || 'Job fehlgeschlagen',
          });
        }
      } catch (err: any) {
        console.warn('Job poll error', err);
      }
    }, 1200);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeChatJobId, activeChat.id, activeCharacter, characters, settings.modelName]);

  useEffect(() => {
    if (!activeImitateJobId) return;
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeImitateJobId}`);
        if (!res.ok) {
          if (isSubscribed && res.status === 404) {
            clearInterval(interval);
            removePendingJob(activeImitateJobId);
            setActiveImitateJobId(null);
            setIsImitating(false);
            const message = 'Der Imitate-Me-Job ist auf dem Server nicht mehr vorhanden. Bitte erneut versuchen.';
            setErrorMessage(message);
            addLog({
              type: 'error',
              status: 'error',
              model: settings.modelName || 'openrouter',
              message,
            });
          }
          return;
        }
        const job = await res.json();
        if (job.status === 'completed' && isSubscribed) {
          clearInterval(interval);
          removePendingJob(activeImitateJobId);
          setActiveImitateJobId(null);
          setIsImitating(false);
          const draft = String(job.result?.draft || '').trim();
          if (draft) {
            setInput((prev) => (prev.trim() ? `${prev}\n\n${draft}` : draft));
            addLog({
              type: 'imitate',
              status: 'success',
              model: job.result.modelUsed || settings.modelName || 'openrouter',
              latencyMs: job.result.latencyMs,
              message: 'Imitate Me Entwurf in Eingabefeld eingefügt',
            });
          } else {
            const message = 'Imitate Me wurde beendet, aber das Modell hat keinen nutzbaren Entwurf geliefert.';
            setErrorMessage(message);
            addLog({
              type: 'error',
              status: 'error',
              model: job.result?.modelUsed || settings.modelName || 'openrouter',
              latencyMs: job.result?.latencyMs,
              message,
            });
          }
        } else if ((job.status === 'failed' || job.status === 'error') && isSubscribed) {
          clearInterval(interval);
          removePendingJob(activeImitateJobId);
          setActiveImitateJobId(null);
          setIsImitating(false);
          setErrorMessage(job.error || 'Konnte keinen Entwurf generieren.');
          addLog({
            type: 'error',
            status: 'error',
            model: settings.modelName || 'openrouter',
            message: job.error || 'Imitate Job fehlgeschlagen',
          });
        }
      } catch (err) {
        console.warn('Imitate poll error', err);
      }
    }, 1200);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeImitateJobId, settings.modelName]);

  useEffect(() => {
    if (!activePhotoJobId) return;
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activePhotoJobId}`);
        if (!res.ok) return;
        const job = await res.json();
        if (job.status === 'completed' && isSubscribed) {
          clearInterval(interval);
          removePendingJob(activePhotoJobId);
          setActivePhotoJobId(null);
          setIsPhotoJobRunning(false);
          setIsGenerating(false);
          if (job.result?.content) {
            const targetChatId = job.chatId || activeChat.id;
            const charObj = job.characterId
              ? characters.find((c) => c.id === job.characterId) || activeCharacter
              : activeCharacter;
            const newMsg: Message = {
              id: `msg-${Date.now()}`,
              role: (job.result.role || (charObj.id === 'char-dean' ? 'dean' : 'character')) as 'dean' | 'character',
              content: job.result.content,
              timestamp: Date.now(),
              speakerName: job.result.speakerName || charObj.name,
              image: job.result.image,
            };
            setChats((prev) => prev.map((c) => c.id === targetChatId
              ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() }
              : c));
            addLog({
              type: 'photo',
              status: 'success',
              model: job.result.modelUsed || 'openrouter',
              latencyMs: job.result.latencyMs,
              message: `${charObj.name} hat ein Foto gesendet`,
            });
            setTimeout(() => scrollToBottom(), 100);
          }
        } else if ((job.status === 'failed' || job.status === 'error') && isSubscribed) {
          clearInterval(interval);
          removePendingJob(activePhotoJobId);
          setActivePhotoJobId(null);
          setIsPhotoJobRunning(false);
          setIsGenerating(false);
          setErrorMessage(job.error || 'Foto-Generierung fehlgeschlagen.');
        }
      } catch (err) {
        console.warn('Photo job poll error', err);
      }
    }, 1200);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activePhotoJobId, activeChat.id, activeCharacter, characters]);

  const handleSendMessage = async (textToSend?: string, isImitated: boolean = false) => {
    const content = (textToSend || input).trim();
    const currentAttachedImage = attachedImage;
    if ((!content && !currentAttachedImage) || isGenerating) return;

    setErrorMessage(null);
    setInput('');
    setAttachedImage(null);

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'lidii',
      content: content || (currentAttachedImage ? '[Foto gesendet]' : ''),
      timestamp: Date.now(),
      speakerName: activeCharacter.playerAddressName || 'Lidii',
      metadata: isImitated ? { isImitated: true } : undefined,
      image: currentAttachedImage
        ? { url: currentAttachedImage, caption: `Foto von ${activeCharacter.playerAddressName || 'Lidii'}` }
        : undefined,
    };

    const currentChatId = activeChat.id;
    const currentCharId = activeCharacter.id;
    const updatedMessages = [...activeChat.messages, userMsg];
    updateCurrentChat((c) => ({ ...c, messages: updatedMessages, updatedAt: Date.now() }));
    setTimeout(() => scrollToBottom(), 50);
    setIsGenerating(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/jobs/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          storyContext: activeChat.storyContext,
          character: activeCharacter,
          language: activeChat.language || 'de',
          settings,
          chatId: currentChatId,
          characterId: currentCharId,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);

      if (data.jobId) {
        setActiveChatJobId(data.jobId);
        addPendingJob({
          id: data.jobId,
          type: 'chat',
          characterId: currentCharId,
          chatId: currentChatId,
          createdAt: Date.now(),
        });
      } else if (data.content) {
        setIsGenerating(false);
        const messageRole = (data.role || (activeCharacter.id === 'char-dean' ? 'dean' : 'character')) as 'dean' | 'character';
        const charMsg: Message = {
          id: `msg-${Date.now()}`,
          role: messageRole,
          content: data.content,
          timestamp: data.timestamp || Date.now(),
          speakerName: data.speakerName || activeCharacter.name,
        };
        updateCurrentChat((c) => ({ ...c, messages: [...updatedMessages, charMsg], updatedAt: Date.now() }));
        addLog({
          type: 'chat',
          status: 'success',
          model: data.modelUsed || settings.modelName || 'openrouter',
          latencyMs: data.latencyMs || Date.now() - startTime,
          message: `${activeCharacter.name} Antwort generiert (${data.content.length} Zeichen)`,
        });
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Verbindung zum KI-Modell fehlgeschlagen.';
      setErrorMessage(errorMsg);
      setIsGenerating(false);
      addLog({
        type: 'error',
        status: 'error',
        model: settings.modelName || 'openrouter',
        latencyMs: Date.now() - startTime,
        message: errorMsg,
      });
    }
  };

  const handleImitateMe = async () => {
    if (isImitating || isGenerating) return;
    setIsImitating(true);
    setErrorMessage(null);
    const startTime = Date.now();
    try {
      const response = await fetch('/api/jobs/imitate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: activeChat.messages,
          storyContext: activeChat.storyContext,
          character: activeCharacter,
          language: activeChat.language || 'de',
          settings,
          characterId: activeCharacter.id,
          chatId: activeChat.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
      if (data.jobId) {
        setActiveImitateJobId(data.jobId);
        addPendingJob({
          id: data.jobId,
          type: 'imitate',
          characterId: activeCharacter.id,
          chatId: activeChat.id,
          createdAt: Date.now(),
        });
      } else if (data.draft) {
        setIsImitating(false);
        const draftText = data.draft;
        setInput((prev) => (prev.trim() ? `${prev}\n\n${draftText}` : draftText));
        addLog({
          type: 'imitate',
          status: 'success',
          model: data.modelUsed || settings.modelName || 'openrouter',
          latencyMs: data.latencyMs || Date.now() - startTime,
          message: 'Imitate Me Entwurf generiert',
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Konnte keinen Entwurf generieren.';
      setErrorMessage(errorMsg);
      setIsImitating(false);
      addLog({
        type: 'error',
        status: 'error',
        model: settings.modelName || 'openrouter',
        latencyMs: Date.now() - startTime,
        message: errorMsg,
      });
    }
  };

  const handleRequestPhoto = async () => {
    if (isGenerating || isPhotoJobRunning) return;
    setIsPhotoJobRunning(true);
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/jobs/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: activeCharacter,
          currentScene: activeChat.storyContext?.currentScene,
          language: activeChat.language || 'de',
          characterId: activeCharacter.id,
          chatId: activeChat.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Fehler beim Starten der Foto-Generierung.');
      if (data.jobId) {
        setActivePhotoJobId(data.jobId);
        addPendingJob({
          id: data.jobId,
          type: 'photo',
          characterId: activeCharacter.id,
          chatId: activeChat.id,
          createdAt: Date.now(),
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Konnte kein Foto anfordern.');
      setIsPhotoJobRunning(false);
      setIsGenerating(false);
    }
  };

  const triggerBackgroundSummarize = async () => {
    setIsSummarizing(true);
    const startTime = Date.now();
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: activeCharacter,
          messages: activeChat.messages,
          currentScene: activeChat.storyContext.currentScene,
          currentSummary: activeChat.storyContext.sceneSummary,
          keyEvents: activeChat.storyContext.keyEvents,
          language: activeChat.language || 'de',
          settings,
        }),
      });
      const data = await response.json();
      if (response.ok && data.summary) {
        updateCurrentChat((c) => ({
          ...c,
          storyContext: { ...c.storyContext, sceneSummary: data.summary },
        }));
        addLog({
          type: 'summarize',
          status: 'success',
          model: data.modelUsed || 'openrouter',
          latencyMs: data.latencyMs || Date.now() - startTime,
          message: 'Chat Memory aktualisiert',
        });
      }
    } catch (err) {
      console.warn('Background summarize failed', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleEditMessage = (id: string, newContent: string) => {
    updateCurrentChat((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === id ? { ...m, content: newContent, metadata: { ...m.metadata, editedAt: Date.now() } } : m
      ),
      updatedAt: Date.now(),
    }));
  };

  const handleDeleteMessage = (id: string) => {
    updateCurrentChat((c) => ({ ...c, messages: c.messages.filter((m) => m.id !== id), updatedAt: Date.now() }));
  };

  const handleResetToCanon = () => {
    const normalizedDefaults = DEFAULT_CHARACTERS.map(normalizeLegacyCharacterToV2);
    setCharacters(normalizedDefaults);
    setChats(DEFAULT_CHATS);
    setActiveCharacterId(normalizedDefaults[0].id);
    setActiveChatId(DEFAULT_CHATS[0].id);
    setErrorMessage(null);
  };

  const hasRecentErrors = logs.some(
    (l) => l.status === 'error' && Date.now() - l.timestamp < 1000 * 60 * 5
  );

  return (
    <div id="app-root" className="flex h-screen w-full flex-col bg-[#090a0d] text-zinc-100 antialiased selection:bg-rose-900 selection:text-white">
      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col bg-[#0d0f14] shadow-2xl border-x border-zinc-900/80">
        {currentView === 'chat' && (
          <div className="flex h-full flex-col">
            <Header
              character={activeCharacter}
              activeChat={activeChat}
              onBackToChats={() => {
                setActiveTab('chats');
                setCurrentView('main');
              }}
              onOpenProfileModal={() => setIsProfileModalOpen(true)}
              onOpenMenuDrawer={() => setIsMenuDrawerOpen(true)}
              onRequestPhoto={handleRequestPhoto}
              onToggleChatLanguage={handleToggleCurrentChatLanguage}
              onOpenContext={() => setIsContextModalOpen(true)}
              isGenerating={isGenerating}
              hasErrors={hasRecentErrors}
            />

            {errorMessage && (
              <div id="global-error-banner" className="flex items-center justify-between border-b border-rose-900/60 bg-rose-950/80 px-4 py-2 text-xs text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
                <button onClick={() => setErrorMessage(null)} className="ml-2 text-rose-400 hover:text-rose-100">✕</button>
              </div>
            )}

            <main
              id="chat-messages-container"
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto py-3 space-y-1"
            >
              {activeChat.storyContext?.currentScene && (
                <div className="my-2.5 mx-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-center text-[11px] text-zinc-400">
                  <span className="font-semibold text-zinc-300">Szene: </span>
                  {activeChat.storyContext.currentScene}
                </div>
              )}

              {activeChat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500 text-xs px-6">
                  <p className="font-medium text-zinc-400 mb-1">Noch keine Nachrichten in diesem Chat.</p>
                  <p>Schreibe deinen ersten Spielzug unten oder nutze „Imitate me“.</p>
                </div>
              ) : (
                activeChat.messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    character={activeCharacter}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                  />
                ))
              )}

              {isGenerating && <TypingIndicator characterName={activeCharacter.name} avatarUrl={activeCharacter.avatarUrl} />}
              <div ref={messagesEndRef} className="h-2" />
            </main>

            {showScrollBottom && (
              <button
                id="scroll-to-bottom-btn"
                onClick={() => scrollToBottom()}
                className="absolute bottom-24 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-200 shadow-lg backdrop-blur hover:bg-zinc-800"
                title="Nach unten scrollen"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}

            <ChatInput
              input={input}
              setInput={setInput}
              attachedImage={attachedImage}
              setAttachedImage={setAttachedImage}
              onSend={() => handleSendMessage()}
              onImitateMe={handleImitateMe}
              isGenerating={isGenerating}
              isImitating={isImitating}
              character={activeCharacter}
              language={activeChat.language || 'de'}
            />
          </div>
        )}

        {currentView === 'main' && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chats' && (
                <ChatListView
                  characters={characters}
                  chats={chats}
                  activeChatId={activeChatId}
                  onSelectChat={handleOpenChat}
                  onCreateChat={handleCreateNewChat}
                  onDeleteChat={handleDeleteChat}
                  onUpdateChat={handleUpdateChat}
                  onNavigateToCharacters={() => setActiveTab('characters')}
                />
              )}

              {activeTab === 'characters' && (
                <CharacterListView
                  characters={characters}
                  onSelectCharacterToChat={handleSelectCharacterToChat}
                  onEditCharacter={(char) => {
                    setEditingCharacter(char);
                    setIsEditorModalOpen(true);
                  }}
                  onCreateNewCharacter={() => {
                    setEditingCharacter(null);
                    setIsEditorModalOpen(true);
                  }}
                  onDeleteCharacter={handleDeleteCharacter}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsHomeView
                  onOpenGeneration={() => setIsSettingsModalOpen(true)}
                  onOpenData={() => setIsImportExportModalOpen(true)}
                  onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
                />
              )}
            </div>

            <Navigation
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              chatsCount={chats.length}
              charactersCount={characters.length}
            />
          </div>
        )}
      </div>

      <ChatMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        character={activeCharacter}
        baseCharacter={baseCharacter}
        activeChat={activeChat}
        onOpenContextModal={() => setIsContextModalOpen(true)}
        onOpenCharacterEditor={() => {
          setEditingCharacter(baseCharacter);
          setIsEditorModalOpen(true);
        }}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onRequestPhoto={handleRequestPhoto}
        onToggleLanguage={handleToggleCurrentChatLanguage}
        onUpdateChat={handleUpdateChat}
        onClearChatHistory={handleClearChatHistory}
        onDeleteChat={() => handleDeleteChat(activeChat.id)}
        isGenerating={isGenerating}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        character={activeCharacter}
        onOpenEdit={() => {
          setEditingCharacter(baseCharacter);
          setIsEditorModalOpen(true);
        }}
      />

      <CharacterEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        character={editingCharacter}
        onSave={handleSaveCharacter}
      />

      <StoryContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        context={activeChat.storyContext}
        characterName={activeCharacter.name}
        onUpdateContext={(newCtx) => {
          updateCurrentChat((c) => ({ ...c, storyContext: newCtx, updatedAt: Date.now() }));
        }}
        onTriggerSummarize={triggerBackgroundSummarize}
        isSummarizing={isSummarizing}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onResetToCanon={handleResetToCanon}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        character={activeCharacter}
        activeChat={activeChat}
        allCharacters={characters}
        allChats={chats}
        settings={settings}
        onImportMessagesToChat={(newMsgs, overwrite) => {
          updateCurrentChat((c) => ({
            ...c,
            messages: overwrite ? newMsgs : [...c.messages, ...newMsgs],
            updatedAt: Date.now(),
          }));
          setTimeout(() => scrollToBottom(), 100);
        }}
        onRestoreFullBackup={(data) => {
          if (data.characters && data.characters.length > 0) {
            const normalized = data.characters.map(normalizeLegacyCharacterToV2);
            setCharacters(normalized);
            setActiveCharacterId(normalized[0].id);
          }
          if (data.chats && data.chats.length > 0) {
            setChats(data.chats);
            setActiveChatId(data.chats[0].id);
          }
          if (data.settings) setSettings(data.settings);
          setTimeout(() => scrollToBottom(), 100);
        }}
        onImportCharacterCard={(importedChar) => {
          const normalizedImported = normalizeLegacyCharacterToV2(importedChar);
          setCharacters((prev) => {
            const existingIdx = prev.findIndex((c) => c.id === normalizedImported.id);
            if (existingIdx >= 0) {
              const copy = [...prev];
              copy[existingIdx] = normalizedImported;
              return copy;
            }
            return [...prev, normalizedImported];
          });
          setActiveCharacterId(normalizedImported.id);
        }}
      />

      <DiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
        serverStatus={serverStatus}
        activeCharacter={activeCharacter}
        activeChat={activeChat}
        settings={settings}
      />
    </div>
  );
}
