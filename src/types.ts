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
  keys?: string[];
  createdAt: number;
}

export interface StoryContext {
  canonBackground?: string;
  currentScene: string;
  sceneSummary: string;
  keyEvents: string[];
  memories?: MemoryItem[];
  profile?: string;
}

export type CharacterProfile = Character;

export type ImageFrequency = 'disabled' | 'rare' | 'occasional' | 'frequent' | 'very_frequent';

export type DominanceLevel =
  | 'level_1_very_restrained'
  | 'level_2_gentle'
  | 'level_3_lightly_leading'
  | 'level_4_confident'
  | 'level_5_dominant'
  | 'level_6_strongly_dominant'
  | 'level_7_controlling'
  | 'level_8_very_controlling'
  | 'level_9_extremely_dominant'
  | 'dominant'
  | 'balanced'
  | 'submissive'
  | 'restrained';

export type PacingMode = 'slow_burn' | 'balanced' | 'fast';
export type PlotInitiativeLevel = 'high' | 'medium' | 'low';

export interface Character {
  id: string;
  name: string;
  avatarUrl: string;
  age?: string;
  appearance: string;
  background: string;
  relationshipToPlayer: string;
  writingStyle: string;
  toneOfVoice: string;
  typicalPhrases: string;
  playerAddressName: string;
  addressMode?: 'auto' | 'custom';
  nicknames?: string;
  thoughtsEnabled: boolean;
  initiativeLevel: 'high' | 'medium' | 'low';
  plotInitiative?: PlotInitiativeLevel;
  pacing?: PacingMode;
  flirtBehavior: 'intense' | 'playful' | 'subtle' | 'none';
  dominanceLevel: DominanceLevel;
  dynamics?: string[];
  humorLevel?: 'dark' | 'dry' | 'playful' | 'serious';
  humorStyles?: string[];
  behaviorRules: string;
  startPlot?: string;
  startBehavior?: string;
  startPrompt?: string;
  exampleDialogues?: string;
  imageFrequency?: ImageFrequency;
  imageStyleDescription?: string;
  customInstructions?: string;
  memories: MemoryItem[];

  description?: string;
  personality: string;
  scenario?: string;
  firstMes?: string;
  mesExample?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
  alternateGreetings?: string[];
  characterBook?: import('./types/characterCardV2').CharacterBook;
  creatorNotes?: string;
  tags?: string[];
  creator?: string;
  characterVersion?: string;
  extensions?: Record<string, any>;

  createdAt: number;
  updatedAt: number;
}

export type ChatLanguage = 'de' | 'en';

export interface ChatCharacterSettings {
  description?: string;
  personality?: string;
  scenario?: string;
  mesExample?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;

  dominanceLevel?: DominanceLevel;
  dynamics?: string[];
  humorLevel?: 'dark' | 'dry' | 'playful' | 'serious';
  humorStyles?: string[];
  initiativeLevel?: 'high' | 'medium' | 'low';
  plotInitiative?: PlotInitiativeLevel;
  pacing?: PacingMode;
  flirtBehavior?: 'intense' | 'playful' | 'subtle' | 'none';
  thoughtsEnabled?: boolean;
  writingStyle?: string;
  toneOfVoice?: string;
  typicalPhrases?: string;
  behaviorRules?: string;
  exampleDialogues?: string;
  customInstructions?: string;
}

export interface ChatSession {
  id: string;
  characterId: string;
  title: string;
  language: ChatLanguage;
  characterSettings?: ChatCharacterSettings;
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
