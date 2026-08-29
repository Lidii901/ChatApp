import { DEFAULT_CHARACTERS, DEFAULT_CHATS } from '../data/defaultCharacters';
import { Character, ChatSession, ModelSettings, ApiLog, Message, StoryContext } from '../types';

const STORAGE_KEY_CHARACTERS = 'rp_characters_v2';
const STORAGE_KEY_ACTIVE_CHAR = 'rp_active_char_id_v2';
const STORAGE_KEY_CHATS = 'rp_chat_sessions_v2';
const STORAGE_KEY_ACTIVE_CHAT = 'rp_active_chat_id_v2';
const STORAGE_KEY_SETTINGS = 'rp_settings_v2';
const STORAGE_KEY_LOGS = 'rp_logs_v2';
const STORAGE_KEY_PENDING_JOBS = 'rp_pending_jobs_v2';

export interface PendingJobInfo {
  id: string;
  type: 'chat' | 'imitate' | 'summarize' | 'photo' | 'start-chat';
  characterId: string;
  chatId: string;
  createdAt: number;
}

export function loadPendingJobs(): PendingJobInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING_JOBS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        return parsed.filter((j: any) => j && j.id && now - (j.createdAt || 0) < 3600000);
      }
    }
  } catch (e) {
    console.error('Failed to load pending jobs from localStorage', e);
  }
  return [];
}

export function savePendingJobs(jobs: PendingJobInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PENDING_JOBS, JSON.stringify(jobs));
  } catch (e) {
    console.error('Failed to save pending jobs to localStorage', e);
  }
}

export function addPendingJob(job: PendingJobInfo): void {
  const current = loadPendingJobs().filter((j) => j.id !== job.id);
  current.push(job);
  savePendingJobs(current);
}

export function removePendingJob(jobId: string): void {
  const current = loadPendingJobs().filter((j) => j.id !== jobId);
  savePendingJobs(current);
}

export const DEFAULT_IMPERSONATION_PROMPT = `Write {{user}}'s next response based only on the established conversation, scenario, user profile/persona and chat memory. Match {{user}}'s established writing style and perspective. Do not write actions, dialogue, thoughts or decisions for {{char}}. Do not invent prior meetings, relationship history, names, memories, knowledge or familiarity that are not established in the available context.`;

export const DEFAULT_SETTINGS: ModelSettings = {
  provider: 'openrouter',
  modelName: '',
  temperature: 0.88,
  maxOutputTokens: 2200,
  contextSizeTokens: 32768,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  repetitionPenalty: 1,
  promptNote: '',
  promptNoteDepth: 1,
  promptNoteRole: 'system',
  assistantPrefill: '',
  impersonationPrompt: DEFAULT_IMPERSONATION_PROMPT,
};

/**
 * One-time compatibility bridge for characters created by older ChatApp versions.
 * The production prompt builder stays Character Card V2-centric; legacy profile text
 * is consolidated into visible V2 fields before the character reaches that builder.
 */
export function normalizeLegacyCharacterToV2(character: Character): Character {
  const hasDirectV2Fields =
    character.description !== undefined ||
    character.scenario !== undefined ||
    character.firstMes !== undefined ||
    character.mesExample !== undefined;

  if (hasDirectV2Fields) return character;

  const descriptionSections = [
    character.appearance,
    character.background ? `Background:\n${character.background}` : '',
    character.relationshipToPlayer
      ? `Relationship / prior context with {{user}}:\n${character.relationshipToPlayer}`
      : '',
    character.writingStyle ? `Writing style:\n${character.writingStyle}` : '',
    character.toneOfVoice ? `Voice / tone:\n${character.toneOfVoice}` : '',
    character.typicalPhrases ? `Typical speech examples:\n${character.typicalPhrases}` : '',
    character.startBehavior ? `Behavior:\n${character.startBehavior}` : '',
    character.dynamics?.length ? `Relationship / role dynamics:\n${character.dynamics.join(', ')}` : '',
    character.humorStyles?.length ? `Humor / tonal traits:\n${character.humorStyles.join(', ')}` : '',
    character.dominanceLevel ? `Legacy interpersonal style: ${character.dominanceLevel}` : '',
    character.pacing ? `Legacy pacing preference: ${character.pacing}` : '',
    character.flirtBehavior ? `Legacy flirt behavior: ${character.flirtBehavior}` : '',
    character.plotInitiative || character.initiativeLevel
      ? `Legacy plot initiative: ${character.plotInitiative || character.initiativeLevel}`
      : '',
  ].filter(Boolean);

  const legacyInstructions = [character.behaviorRules, character.customInstructions]
    .filter(value => typeof value === 'string' && value.trim())
    .join('\n\n');

  return {
    ...character,
    description: descriptionSections.join('\n\n'),
    scenario: character.startPlot || '',
    firstMes: character.startPrompt || '',
    mesExample: character.exampleDialogues || '',
    postHistoryInstructions:
      character.postHistoryInstructions !== undefined
        ? character.postHistoryInstructions
        : legacyInstructions,
  };
}

/**
 * Returns the effective character for a specific chat session by overlaying
 * prompt-effective chat-specific Character Card V2 fields over the base character.
 * Old saved override fields are retained for data compatibility but are no longer
 * treated as a hidden parallel prompt system.
 */
export function getEffectiveCharacter(character: Character, chat?: ChatSession): Character {
  if (!character) return normalizeLegacyCharacterToV2(DEFAULT_CHARACTERS[0]);
  const normalized = normalizeLegacyCharacterToV2(character);
  if (!chat || !chat.characterSettings) return normalized;

  return {
    ...normalized,
    ...chat.characterSettings,
    id: normalized.id,
    name: normalized.name,
    avatarUrl: normalized.avatarUrl,
  };
}

export function loadSavedCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHARACTERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((char: Character) => {
          let cleaned = char;
          if (char.id === 'char-dean') {
            const canonicalDean = DEFAULT_CHARACTERS.find((c) => c.id === 'char-dean');
            if (
              canonicalDean &&
              (!char.startPrompt ||
                char.startPrompt.includes('regungslos') ||
                char.startPrompt.includes('Vorsprung') ||
                char.startPrompt.includes('Garten') ||
                char.startPrompt.includes('Collector'))
            ) {
              cleaned = {
                ...char,
                startPrompt: canonicalDean.startPrompt,
                startPlot: canonicalDean.startPlot,
                startBehavior: canonicalDean.startBehavior,
                behaviorRules: canonicalDean.behaviorRules,
                exampleDialogues: canonicalDean.exampleDialogues,
                postHistoryInstructions: canonicalDean.postHistoryInstructions,
              };
            }
          }
          return normalizeLegacyCharacterToV2(cleaned);
        });
      }
    }
  } catch (e) {
    console.error('Failed to load characters from localStorage', e);
  }
  return DEFAULT_CHARACTERS.map(normalizeLegacyCharacterToV2);
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
    if (saved && characters.some((c) => c.id === saved)) return saved;
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
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((chat: ChatSession) => {
          if (chat.id === 'chat-dean-1') {
            const hasOldChase =
              chat.messages?.some(
                (m) =>
                  m.content.includes('regungslos') ||
                  m.content.includes('Vorsprung') ||
                  m.content.includes('60 Sekunden') ||
                  m.content.includes('Sechzig Sekunden') ||
                  m.content.includes('rennt')
              ) ||
              chat.storyContext?.currentScene?.includes('Backsteingasse') ||
              chat.storyContext?.currentScene?.includes('Vorsprung');
            if (hasOldChase) {
              const canonicalChat = DEFAULT_CHATS.find((c) => c.id === 'chat-dean-1');
              if (canonicalChat) return canonicalChat;
            }
          }
          return chat;
        });
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
  return firstForChar?.id || chats[0]?.id || '';
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
      const migrated: ModelSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        provider: 'openrouter',
        contextSizeTokens:
          typeof parsed.contextSizeTokens === 'number' && parsed.contextSizeTokens >= 2048
            ? parsed.contextSizeTokens
            : DEFAULT_SETTINGS.contextSizeTokens,
      };
      // contextWindowSize was the old message-count cutoff. Keep it only as inert
      // compatibility data; never reinterpret 14 messages as 14 tokens.
      return migrated;
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
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load logs', e);
  }
  return [];
}

export function saveLogs(logs: ApiLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs.slice(-60)));
  } catch (e) {
    console.error('Failed to save logs to localStorage', e);
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
  if (!parsed) throw new Error('Ungültiges Dateiformat.');

  const importedSettings: ModelSettings = {
    ...DEFAULT_SETTINGS,
    ...(parsed.settings || {}),
    provider: 'openrouter',
    contextSizeTokens:
      typeof parsed.settings?.contextSizeTokens === 'number' && parsed.settings.contextSizeTokens >= 2048
        ? parsed.settings.contextSizeTokens
        : DEFAULT_SETTINGS.contextSizeTokens,
  };

  if (Array.isArray(parsed.characters) && Array.isArray(parsed.chats)) {
    return {
      characters: parsed.characters.map(normalizeLegacyCharacterToV2),
      chats: parsed.chats,
      settings: importedSettings,
    };
  }

  if (Array.isArray(parsed.messages)) {
    return {
      legacyMessages: parsed.messages,
      legacyContext: parsed.context,
      settings: importedSettings,
    };
  }

  throw new Error('Das Dokument enthält weder Charaktere noch Chat-Nachrichten.');
}
