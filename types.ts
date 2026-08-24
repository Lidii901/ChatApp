export type Role = 'character' | 'lidii' | 'dean';

export interface ChatImage {
  url: string;
  caption?: string;
  prompt?: string;
  isUserUploaded?: boolean;
}

export interface Message {
  id: string;
  role: 'character' | 'lidii' | 'dean';
  speakerName?: string;
  content: string;
  timestamp: number;
  image?: ChatImage;
  metadata?: {
    isImitated?: boolean;
    editedAt?: number;
    tokensUsed?: number;
    modelUsed?: string;
  };
}

export interface MemoryItem {
  id: string;
  category: 'plot' | 'detail' | 'trait' | 'relationship';
  content: string;
  createdAt: number;
}

export interface StoryContext {
  canonBackground?: string;
  currentScene: string;
  sceneSummary: string;
  keyEvents: string[];
  memories?: MemoryItem[];
}

export type CharacterProfile = Character;

export type ImageFrequency = 'disabled' | 'rare' | 'occasional' | 'frequent' | 'very_frequent';

export interface Character {
  id: string;
  name: string;
  avatarUrl: string;
  age?: string;
  appearance: string;
  personality: string;
  background: string;
  relationshipToPlayer: string;
  writingStyle: string;
  toneOfVoice: string;
  typicalPhrases: string;
  playerAddressName: string; // e.g. "Lidii"
  nicknames?: string; // e.g. "Little Girl, Little Lamb, Brat, Whore, Pretty Girl, Pretty Princess, My Little Slut"
  thoughtsEnabled: boolean; // Render thoughts in italics
  initiativeLevel: 'high' | 'medium' | 'low';
  flirtBehavior: 'intense' | 'playful' | 'subtle' | 'none';
  dominanceLevel: 'dominant' | 'balanced' | 'submissive' | 'restrained';
  humorLevel?: 'dark' | 'dry' | 'playful' | 'serious';
  behaviorRules: string;
  startPlot?: string; // Scenario / setting description for new chats
  startBehavior?: string; // How the character behaves at the start
  startPrompt?: string; // Optional static fallback starter
  imageFrequency?: ImageFrequency;
  imageStyleDescription?: string;
  customInstructions?: string;
  memories: MemoryItem[];
  createdAt: number;
  updatedAt: number;
}

export type ChatLanguage = 'de' | 'en';

export interface ChatSession {
  id: string;
  characterId: string;
  title: string;
  language: ChatLanguage;
  messages: Message[];
  storyContext: StoryContext;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
  lastJobId?: string;
}

export interface ModelSettings {
  provider: 'openrouter';
  modelName: string;
  temperature: number;
  maxOutputTokens: number;
  contextWindowSize: number;
}

export interface AsyncJob {
  id: string;
  type: 'chat' | 'imitate' | 'summarize' | 'photo' | 'start-chat';
  characterId?: string;
  chatId?: string;
  status: 'running' | 'completed' | 'failed';
  result?: {
    content?: string;
    draft?: string;
    image?: ChatImage;
    modelUsed?: string;
    latencyMs?: number;
    role?: string;
    speakerName?: string;
  };
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface ApiLog {
  id: string;
  timestamp: number;
  type: 'chat' | 'imitate' | 'summarize' | 'photo' | 'start-chat' | 'error' | 'info';
  status: 'pending' | 'success' | 'error';
  model: string;
  latencyMs?: number;
  message?: string;
  details?: any;
}
