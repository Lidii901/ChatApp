// Character Card V2 Specification & Chub AI Data Types
// References:
// - https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md
// - https://docs.chub.ai/docs/advanced-setups/prompting
// - https://docs.chub.ai/docs/the-basics/character-creation

export interface CharacterBookEntry {
  id?: number | string;
  keys: string[];
  content: string;
  secondary_keys?: string[];
  comment?: string;
  insertion_order?: number;
  case_sensitive?: boolean;
  name?: string;
  priority?: number;
  extensions?: Record<string, any>;
  enabled?: boolean;
  selective?: boolean;
  constant?: boolean;
  position?: string;
}

export interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, any>;
  entries: CharacterBookEntry[];
}

export interface CharacterCardV2Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  character_book?: CharacterBook;
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: Record<string, any>;
}

export interface CharacterCardV2 {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: CharacterCardV2Data;
}
