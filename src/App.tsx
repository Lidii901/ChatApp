import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Character,
  ChatSession,
  ChatLanguage,
  Message,
  StoryContext,
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
  savePendingJobs,
  addPendingJob,
  removePendingJob,
  PendingJobInfo,
  DEFAULT_SETTINGS,
  getEffectiveCharacter,
} from './utils/contextManager';
import { DEFAULT_CHARACTERS, DEFAULT_CHATS } from './data/defaultCharacters';
import { Header } from './components/Header';
import { Navigation, MainTab } from './components/Navigation';
import { ChatListView } from './components/ChatListView';
import { CharacterListView } from './components/CharacterListView';
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
import { ArrowDown, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [currentView, setCurrentView] = useState<'chat' | 'main'>('chat');

  // State: Characters & Active Character
  const [characters, setCharacters] = useState<Character[]>(loadSavedCharacters);
  const [activeCharacterId, setActiveCharacterId] = useState<string>(() =>
    loadActiveCharacterId(characters)
  );

  // State: Chats & Active Chat
  const [chats, setChats] = useState<ChatSession[]>(loadSavedChats);
  const [activeChatId, setActiveChatId] = useState<string>(() =>
    loadActiveChatId(chats, activeCharacterId)
  );

  // Model settings & Logs
  const [settings, setSettings] = useState<ModelSettings>(loadSavedSettings);
  const [logs, setLogs] = useState<ApiLog[]>(loadSavedLogs);

  // UI / Input state
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImitating, setIsImitating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPhotoJobRunning, setIsPhotoJobRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Job IDs for background polling
  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);
  const [activeImitateJobId, setActiveImitateJobId] = useState<string | null>(null);
  const [activePhotoJobId, setActivePhotoJobId] = useState<string | null>(null);

  // Modals & Drawers state
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

  // Active character and active chat objects
  const baseCharacter = useMemo(() => {
    return (
      characters.find((c) => c.id === activeCharacterId) ||
      characters[0] ||
      DEFAULT_CHARACTERS[0]
    );
  }, [characters, activeCharacterId]);

  const activeChat = useMemo(() => {
    const chat = chats.find((c) => c.id === activeChatId && c.characterId === baseCharacter.id);
    if (chat) return chat;
    // Fallback: first chat belonging to this character
    const firstCharChat = chats.find((c) => c.characterId === baseCharacter.id);
    if (firstCharChat) return firstCharChat;
    // If none exists, create a default chat
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

  // Sync state to local storage
  useEffect(() => {
    saveCharacters(characters);
  }, [characters]);

  useEffect(() => {
    saveActiveCharacterId(activeCharacterId);
  }, [activeCharacterId]);

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveActiveChatId(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  // Initial server config fetch & pending jobs recovery
  useEffect(() => {
    fetch('/api/config')
      .then(async (res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setServerStatus(data);
      })
      .catch((err) => {
        console.warn('Server config error', err);
      });

    // Resume any pending jobs from previous session or page reload
    const pendingJobs = loadPendingJobs();
    if (pendingJobs.length > 0) {
      const chatJob = pendingJobs.find((j) => j.type === 'chat' || j.type === 'start-chat');
      if (chatJob) {
        setActiveChatJobId(chatJob.id);
        setIsGenerating(true);
      }
      const imitateJob = pendingJobs.find((j) => j.type === 'imitate');
      if (imitateJob) {
        setActiveImitateJobId(imitateJob.id);
        setIsImitating(true);
      }
      const photoJob = pendingJobs.find((j) => j.type === 'photo');
      if (photoJob) {
        setActivePhotoJobId(photoJob.id);
        setIsPhotoJobRunning(true);
        setIsGenerating(true);
      }
    }
  }, []);

  // Auto scroll to bottom when active chat messages change
  useEffect(() => {
    if (currentView === 'chat') {
      scrollToBottom('auto');
    }
  }, [activeChatId, activeChat.messages.length, currentView]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const addLog = (newLog: Omit<ApiLog, 'id' | 'timestamp'>) => {
    const logItem: ApiLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...newLog,
    };
    setLogs((prev) => [...prev, logItem]);
  };

  // Helper to update active chat session
  const updateCurrentChat = (updater: (prevChat: ChatSession) => ChatSession) => {
    setChats((prevChats) => {
      const idx = prevChats.findIndex((c) => c.id === activeChat.id);
      if (idx === -1) {
        return [...prevChats, updater(activeChat)];
      }
      const newChats = [...prevChats];
      newChats[idx] = updater(newChats[idx]);
      return newChats;
    });
  };

  // Switch to a specific chat and open chat view
  const handleOpenChat = (chatId: string) => {
    const targetChat = chats.find((c) => c.id === chatId);
    if (targetChat) {
      setActiveCharacterId(targetChat.characterId);
      setActiveChatId(targetChat.id);
      setCurrentView('chat');
    }
  };

  // Switch to character and start/open their chat
  const handleSelectCharacterToChat = (charId: string) => {
    setActiveCharacterId(charId);
    const existing = chats.filter((c) => c.characterId === charId);
    if (existing.length > 0) {
      setActiveChatId(existing[0].id);
      setCurrentView('chat');
    } else {
      handleCreateNewChat(charId, undefined, activeChat?.language || 'de');
    }
  };

  // Create new chat with Character Card V2 greeting / opening scene
  const handleCreateNewChat = async (
    characterId: string,
    customTitle?: string,
    language: 'de' | 'en' = 'de',
    initialMessage?: string
  ) => {
    const char = characters.find((c) => c.id === characterId) || activeCharacter;
    const newChatId = `chat-${char.id}-${Date.now()}`;
    const initialMsgs: Message[] = [];

    // In CCv2 / Chub AI, first_mes is the primary opening greeting
    const firstGreeting = initialMessage !== undefined
      ? initialMessage
      : char.firstMes !== undefined
      ? char.firstMes
      : char.startPrompt;

    if (firstGreeting) {
      const charName = char.name || 'Character';
      const playerAddress = char.playerAddressName || 'User';
      const resolvedGreeting = firstGreeting
        .replace(/{{char}}/gi, charName)
        .replace(/{{user}}/gi, playerAddress);

      initialMsgs.push({
        id: `msg-${Date.now()}`,
        role: char.id === 'char-dean' ? 'dean' : 'character',
        content: resolvedGreeting,
        timestamp: Date.now(),
        speakerName: char.name,
      });
    }

    const cardScenario = char.scenario !== undefined ? char.scenario : char.startPlot;
    const startScenePlot = cardScenario || 'Der Beginn einer neuen Szene.';

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
    setActiveCharacterId(char.id);
    setActiveChatId(newChatId);
    setCurrentView('chat');

    // If character has no first_mes / startPrompt and no initialMessage, trigger start-chat job with selected language
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

  // Delete chat (supports deleting the last chat as well)
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

  // Rename chat
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Update complete chat session (including title, language, scene, and per-chat character settings)
  const handleUpdateChat = (updatedChat: ChatSession) => {
    setChats((prev) =>
      prev.map((c) => (c.id === updatedChat.id ? updatedChat : c))
    );
  };

  // Clear chat messages
  const handleClearChatHistory = () => {
    updateCurrentChat((c) => ({
      ...c,
      messages: [],
      updatedAt: Date.now(),
    }));
  };

  // Handle Character Save / Edit
  const handleSaveCharacter = (savedChar: Character) => {
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === savedChar.id);
      if (exists) {
        return prev.map((c) => (c.id === savedChar.id ? savedChar : c));
      }
      return [...prev, savedChar];
    });

    if (!chats.some((c) => c.characterId === savedChar.id)) {
      handleCreateNewChat(savedChar.id, 'Erster Chat', activeChat?.language || 'de', savedChar.firstMes ?? savedChar.startPrompt);
    } else {
      setActiveCharacterId(savedChar.id);
    }
  };

  // Handle Delete Character
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

  // Toggle Language for Current Chat
  const handleToggleCurrentChatLanguage = () => {
    const nextLang: ChatLanguage = activeChat.language === 'de' ? 'en' : 'de';
    updateCurrentChat((c) => ({ ...c, language: nextLang, updatedAt: Date.now() }));
  };

  // Background Job Poller for Chat & Start-Chat
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
              prevChats.map((c) => {
                if (c.id === targetChatId) {
                  return {
                    ...c,
                    messages: [...c.messages, newMsg],
                    updatedAt: Date.now(),
                  };
                }
                return c;
              })
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

  // Background Job Poller for Imitate Me
  useEffect(() => {
    if (!activeImitateJobId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeImitateJobId}`);
        if (!res.ok) return;
        const job = await res.json();

        if (job.status === 'completed' && isSubscribed) {
          clearInterval(interval);
          removePendingJob(activeImitateJobId);
          setActiveImitateJobId(null);
          setIsImitating(false);

          if (job.result?.draft) {
            const draftText = job.result.draft;
            setInput((prev) => (prev.trim() ? `${prev}\n\n${draftText}` : draftText));
            addLog({
              type: 'imitate',
              status: 'success',
              model: job.result.modelUsed || settings.modelName || 'openrouter',
              latencyMs: job.result.latencyMs,
              message: 'Imitate Me Entwurf in Eingabefeld eingefügt',
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
      } catch (err: any) {
        console.warn('Imitate poll error', err);
      }
    }, 1200);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeImitateJobId, settings.modelName]);

  // Background Job Poller for Photo Request
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
              image: (job.result as any).image,
            };

            setChats((prevChats) =>
              prevChats.map((c) => {
                if (c.id === targetChatId) {
                  return {
                    ...c,
                    messages: [...c.messages, newMsg],
                    updatedAt: Date.now(),
                  };
                }
                return c;
              })
            );

            addLog({
              type: 'photo',
              status: 'success',
              model: job.result.modelUsed || 'openrouter',
              latencyMs: job.result.latencyMs,
              message: `${charName} hat ein Foto gesendet`,
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
      } catch (err: any) {
        console.warn('Photo job poll error', err);
      }
    }, 1200);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activePhotoJobId, activeChat.id, activeCharacter, characters]);

  // 1. Send Message Flow (using robust async job system)
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
        ? {
            url: currentAttachedImage,
            caption: `Foto von ${activeCharacter.playerAddressName || 'Lidii'}`,
          }
        : undefined,
    };

    const currentChatId = activeChat.id;
    const currentCharId = activeCharacter.id;
    const updatedMessages = [...activeChat.messages, userMsg];

    updateCurrentChat((c) => ({
      ...c,
      messages: updatedMessages,
      updatedAt: Date.now(),
    }));

    setTimeout(() => scrollToBottom(), 50);

    setIsGenerating(true);
    const startTime = Date.now();

    try {
      // Use async job endpoint for maximum reliability across switching/refreshing
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

      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

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
          speakerName: activeCharacter.name,
        };

        updateCurrentChat((c) => ({
          ...c,
          messages: [...updatedMessages, charMsg],
          updatedAt: Date.now(),
        }));

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
      console.error('Error generating chat response:', err);
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

  // 2. Imitate Me Flow
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

      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

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
      console.error('Error during Imitate Me:', err);
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

  // 3. Request Situational Photo from Character
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
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Fehler beim Starten der Foto-Generierung.');
      }

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
      console.error('Photo request error:', err);
      setErrorMessage(err.message || 'Konnte kein Foto anfordern.');
      setIsPhotoJobRunning(false);
      setIsGenerating(false);
    }
  };

  // 4. Background Summarize
  const triggerBackgroundSummarize = async () => {
    setIsSummarizing(true);
    const startTime = Date.now();
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: activeChat.messages,
          currentSummary: activeChat.storyContext.sceneSummary,
          keyEvents: activeChat.storyContext.keyEvents,
        }),
      });

      const data = await response.json();

      if (response.ok && data.summary) {
        updateCurrentChat((c) => ({
          ...c,
          storyContext: {
            ...c.storyContext,
            sceneSummary: data.summary,
          },
        }));
        addLog({
          type: 'summarize',
          status: 'success',
          model: data.modelUsed || 'openrouter',
          latencyMs: data.latencyMs || Date.now() - startTime,
          message: 'Szenen-Zusammenfassung aktualisiert',
        });
      }
    } catch (err: any) {
      console.warn('Background summarize failed', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Message edits and deletions
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
    updateCurrentChat((c) => ({
      ...c,
      messages: c.messages.filter((m) => m.id !== id),
      updatedAt: Date.now(),
    }));
  };

  const handleResetToCanon = () => {
    setCharacters(DEFAULT_CHARACTERS);
    setChats(DEFAULT_CHATS);
    setActiveCharacterId(DEFAULT_CHARACTERS[0].id);
    setActiveChatId(DEFAULT_CHATS[0].id);
    setErrorMessage(null);
    setTimeout(() => scrollToBottom(), 50);
  };

  const hasRecentErrors = logs.some(
    (l) => l.status === 'error' && Date.now() - l.timestamp < 1000 * 60 * 5
  );

  return (
    <div
      id="app-root"
      className="flex h-screen w-full flex-col bg-[#090a0d] text-zinc-100 antialiased selection:bg-rose-900 selection:text-white"
    >
      {/* Container Constraint */}
      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col bg-[#0d0f14] shadow-2xl border-x border-zinc-900/80">
        {/* VIEW 1: ACTIVE CHAT SCREEN */}
        {currentView === 'chat' && (
          <div className="flex h-full flex-col">
            {/* Header with Hamburger Menu & Profile View */}
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

            {/* Global Error Banner */}
            {errorMessage && (
              <div
                id="global-error-banner"
                className="flex items-center justify-between border-b border-rose-900/60 bg-rose-950/80 px-4 py-2 text-xs text-rose-200"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="ml-2 text-rose-400 hover:text-rose-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Message Stream */}
            <main
              id="chat-messages-container"
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto py-3 space-y-1"
            >
              {/* Scene point / Location badge */}
              {activeChat.storyContext?.currentScene && (
                <div className="my-2.5 mx-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-center text-[11px] text-zinc-400">
                  <span className="font-semibold text-zinc-300">Szene: </span>
                  {activeChat.storyContext.currentScene}
                </div>
              )}

              {/* Render messages */}
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

              {/* Typing indicator */}
              {isGenerating && (
                <TypingIndicator
                  characterName={activeCharacter.name}
                  avatarUrl={activeCharacter.avatarUrl}
                />
              )}

              <div ref={messagesEndRef} className="h-2" />
            </main>

            {/* Floating Scroll to Bottom Button */}
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

            {/* Input Bar */}
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

        {/* VIEW 2: MAIN HUB NAVIGATION (Chats, Characters, Settings) */}
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
                <div className="h-full overflow-y-auto p-4 space-y-4">
                  <div className="border-b border-zinc-800 pb-3">
                    <h1 className="text-lg font-bold text-zinc-100">Einstellungen & System</h1>
                    <p className="text-xs text-zinc-400">Verwalte Modell-Parameter, Backups und Diagnose</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    >
                      <span className="font-semibold">Modell-Parameter (Temperatur, Tokens, Context)</span>
                      <span className="text-rose-400">Öffnen ▾</span>
                    </button>

                    <button
                      onClick={() => setIsImportExportModalOpen(true)}
                      className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    >
                      <span className="font-semibold">Daten-Backup, Export & Import</span>
                      <span className="text-rose-400">Öffnen ▾</span>
                    </button>

                    <button
                      onClick={() => setIsDiagnosticsModalOpen(true)}
                      className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    >
                      <span className="font-semibold">Diagnose & API-Logs</span>
                      <span className="text-rose-400">Öffnen ▾</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation */}
            <Navigation
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              chatsCount={chats.length}
              charactersCount={characters.length}
            />
          </div>
        )}
      </div>

      {/* Hamburger Menu Drawer */}
      <ChatMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        character={activeCharacter}
        activeChat={activeChat}
        onOpenContextModal={() => setIsContextModalOpen(true)}
        onOpenCharacterEditor={() => {
          setEditingCharacter(activeCharacter);
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

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        character={activeCharacter}
        onOpenEdit={() => {
          setEditingCharacter(activeCharacter);
          setIsEditorModalOpen(true);
        }}
      />

      {/* Character Editor Modal */}
      <CharacterEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        character={editingCharacter}
        onSave={handleSaveCharacter}
      />

      {/* Story Context Modal */}
      <StoryContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        context={activeChat.storyContext}
        characterName={activeCharacter.name}
        onUpdateContext={(newCtx) => {
          updateCurrentChat((c) => ({
            ...c,
            storyContext: newCtx,
            updatedAt: Date.now(),
          }));
        }}
        onTriggerSummarize={triggerBackgroundSummarize}
        isSummarizing={isSummarizing}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onResetToCanon={handleResetToCanon}
      />

      {/* Import / Export Modal */}
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
            setCharacters(data.characters);
            setActiveCharacterId(data.characters[0].id);
          }
          if (data.chats && data.chats.length > 0) {
            setChats(data.chats);
            setActiveChatId(data.chats[0].id);
          }
          if (data.settings) {
            setSettings(data.settings);
          }
          setTimeout(() => scrollToBottom(), 100);
        }}
        onImportCharacterCard={(importedChar) => {
          setCharacters((prev) => {
            const existingIdx = prev.findIndex((c) => c.id === importedChar.id);
            if (existingIdx >= 0) {
              const copy = [...prev];
              copy[existingIdx] = importedChar;
              return copy;
            }
            return [...prev, importedChar];
          });
          setActiveCharacterId(importedChar.id);
        }}
      />

      {/* Diagnostics Modal */}
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
