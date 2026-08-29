// Character Card V2 Specification & Chub AI Data Types
// References:
// - https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md
// - https://docs.chub.ai/docs/advanced-setups/prompting
// - https://docs.chub.ai/docs/advanced-setups/lorebooks
// - https://docs.chub.ai/docs/the-basics/character-creation

export type LoreSelectiveLogic =
  | 0 | 1 | 2 | 3
  | 'AND' | 'OR' | 'NOT'
  | 'AND_ANY' | 'AND_ALL' | 'NOT_ANY' | 'NOT_ALL'
  | 'and_any' | 'and_all' | 'not_any' | 'not_all';

export interface CharacterBookEntry {
  id?: number;
  keys: string[];
  content: string;
  secondary_keys?: string[];
  comment?: string;
  insertion_order: number;
  case_sensitive?: boolean;
  name?: string;
  priority?: number;
  extensions: Record<string, unknown>;
  enabled: boolean;
  selective?: boolean;
  constant?: boolean;
  position?: 'before_char' | 'after_char';

  // Common Chub/exported lorebook activation metadata. These are not required
  // by the core CCv2 schema, so unknown extension values are still preserved.
  selectiveLogic?: LoreSelectiveLogic;
  selective_logic?: LoreSelectiveLogic;
  probability?: number;
  useProbability?: boolean;
  use_probability?: boolean;
}

export interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions: Record<string, unknown>;
  entries: CharacterBookEntry[];
}

export interface CharacterCardV2Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  character_book?: CharacterBook;
  tags: string[];
  creator: string;
  character_version: string;
  extensions: Record<string, any>;
}

export interface CharacterCardV2 {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: CharacterCardV2Data;
}
