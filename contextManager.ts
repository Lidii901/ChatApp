import { DEFAULT_CHARACTERS, DEFAULT_CHATS } from '../data/defaultCharacters';
import { Character, ChatSession, ModelSettings, ApiLog, Message, StoryContext } from '../types';

const STORAGE_KEY_CHARACTERS = 'rp_characters_v2';
const STORAGE_KEY_ACTIVE_CHAR = 'rp_active_char_id_v2';
const STORAGE_KEY_CHATS = 'rp_chat_sessions_v2';
const STORAGE_KEY_ACTIVE_CHAT = 'rp_active_chat_id_v2';
const STORAGE_KEY_SETTINGS = 'rp_settings_v2';
const STORAGE_KEY_LOGS = 'rp_logs_v2';

export const DEFAULT_SETTINGS: ModelSettings = {
  provider: 'openrouter',
  modelName: '',
  temperature: 0.88,
  maxOutputTokens: 2200,
  contextWindowSize: 14,
};

export function loadSavedCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHARACTERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load characters from localStorage', e);
  }
  return DEFAULT_CHARACTERS;
}

export function saveCharacters(characters: Character[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters));
  } catch (e) {
    console.error('Failed to save characters to localStorage', e);
  }
}

export function loadActiveCharacterId(characters: Character[]): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_CHAR);
    if (saved && characters.some((c) => c.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Failed to load active char id', e);
  }
  return characters[0]?.id || 'char-dean';
}

export function saveActiveCharacterId(charId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_CHAR, charId);
  } catch (e) {
    console.error('Failed to save active char id', e);
  }
}

export function loadSavedChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHATS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load chats from localStorage', e);
  }
  return DEFAULT_CHATS;
}

export function saveChats(chats: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
  } catch (e) {
    console.error('Failed to save chats to localStorage', e);
  }
}

export function loadActiveChatId(chats: ChatSession[], characterId: string): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_CHAT);
    const matching = chats.find((c) => c.id === saved && c.characterId === characterId);
    if (matching) return matching.id;
  } catch (e) {
    console.error('Failed to load active chat id', e);
  }
  const firstForChar = chats.find((c) => c.characterId === characterId);
  return firstForChar?.id || chats[0]?.id || 'chat-dean-1';
}

export function saveActiveChatId(chatId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_CHAT, chatId);
  } catch (e) {
    console.error('Failed to save active chat id', e);
  }
}

export function loadSavedSettings(): ModelSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        provider: 'openrouter',
      };
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ModelSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadSavedLogs(): ApiLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load logs', e);
  }
  return [];
}

export function saveLogs(logs: ApiLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs.slice(-60)));
  } catch (e) {
    console.error('Failed to save logs', e);
  }
}

export function exportFullRPState(
  characters: Character[],
  chats: ChatSession[],
  settings: ModelSettings
): string {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    characters,
    chats,
    settings,
  };
  return JSON.stringify(payload, null, 2);
}

export function importFullRPState(jsonString: string): {
  characters?: Character[];
  chats?: ChatSession[];
  settings?: ModelSettings;
  legacyMessages?: Message[];
  legacyContext?: StoryContext;
} {
  const parsed = JSON.parse(jsonString);
  if (!parsed) {
    throw new Error('Ungültiges Dateiformat.');
  }

  // Version 2 structure
  if (Array.isArray(parsed.characters) && Array.isArray(parsed.chats)) {
    return {
      characters: parsed.characters,
      chats: parsed.chats,
      settings: parsed.settings || DEFAULT_SETTINGS,
    };
  }

  // Legacy Version 1 structure fallback
  if (Array.isArray(parsed.messages)) {
    return {
      legacyMessages: parsed.messages,
      legacyContext: parsed.context,
      settings: parsed.settings || DEFAULT_SETTINGS,
    };
  }

  throw new Error('Das Dokument enthält weder Charaktere noch Chat-Nachrichten.');
}
