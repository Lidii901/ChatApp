import { Character, MemoryItem } from '../types';
import { CharacterCardV2, CharacterCardV2Data } from '../types/characterCardV2';

/**
 * Converts a CharacterCardV2 (or V2 Data payload) into internal Character format
 */
export function characterCardV2ToCharacter(card: CharacterCardV2 | CharacterCardV2Data, fallbackId?: string): Character {
  const data: CharacterCardV2Data = 'data' in card ? card.data : card;
  const charId = fallbackId || `char-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Convert character_book entries to memories
  const memories: MemoryItem[] = [];
  if (data.character_book && Array.isArray(data.character_book.entries)) {
    data.character_book.entries.forEach((entry, idx) => {
      if (entry && entry.content) {
        memories.push({
          id: `mem-book-${entry.id || idx}-${Date.now()}`,
          category: 'detail',
          content: entry.content,
          keys: entry.keys || [],
          createdAt: Date.now(),
        });
      }
    });
  }

  // Parse any existing extensions or fallback values
  const ex = data.extensions || {};

  return {
    id: charId,
    name: data.name || 'Neuer Charakter',
    avatarUrl: ex.avatarUrl || '',
    age: ex.age || '',
    appearance: ex.appearance || data.description || '',
    description: data.description || '',
    personality: data.personality || '',
    background: ex.background || '',
    relationshipToPlayer: ex.relationshipToPlayer || '',
    writingStyle: ex.writingStyle || '',
    toneOfVoice: ex.toneOfVoice || '',
    typicalPhrases: ex.typicalPhrases || '',
    playerAddressName: ex.playerAddressName || 'Lidii',
    addressMode: ex.addressMode || 'auto',
    nicknames: ex.nicknames || '',
    thoughtsEnabled: ex.thoughtsEnabled !== undefined ? ex.thoughtsEnabled : true,
    initiativeLevel: ex.initiativeLevel || 'medium',
    plotInitiative: ex.plotInitiative || 'medium',
    pacing: ex.pacing || 'slow_burn',
    flirtBehavior: ex.flirtBehavior || 'subtle',
    dominanceLevel: ex.dominanceLevel || 'level_5_dominant',
    dynamics: ex.dynamics || [],
    humorLevel: ex.humorLevel || 'playful',
    humorStyles: ex.humorStyles || [],
    behaviorRules: ex.behaviorRules || '',
    startPlot: data.scenario || ex.startPlot || '',
    scenario: data.scenario || '',
    startBehavior: ex.startBehavior || '',
    startPrompt: data.first_mes || ex.startPrompt || '',
    firstMes: data.first_mes || '',
    exampleDialogues: data.mes_example || '',
    mesExample: data.mes_example || '',
    systemPrompt: data.system_prompt || '',
    postHistoryInstructions: data.post_history_instructions || '',
    alternateGreetings: data.alternate_greetings || [],
    characterBook: data.character_book,
    creatorNotes: data.creator_notes || '',
    tags: data.tags || [],
    creator: data.creator || '',
    characterVersion: data.character_version ?? '1.0',
    extensions: data.extensions || {},
    imageFrequency: ex.imageFrequency || 'occasional',
    imageStyleDescription: ex.imageStyleDescription || '',
    customInstructions: ex.customInstructions || '',
    memories,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Converts internal Character object into a strict Character Card V2 compliant JSON object
 */
export function characterToCharacterCardV2(character: Character): CharacterCardV2 {
  const characterBook = character.characterBook
    ? {
        ...character.characterBook,
        extensions: character.characterBook.extensions ?? {},
        entries: (character.characterBook.entries || []).map((entry, index) => {
          const { id, ...entryWithoutId } = entry;
          return {
            ...entryWithoutId,
            ...(typeof id === 'number' ? { id } : {}),
            extensions: entry.extensions ?? {},
            enabled: entry.enabled ?? true,
            insertion_order: entry.insertion_order ?? index,
          };
        }),
      }
    : undefined;
  const v2Data: CharacterCardV2Data = {
    name: character.name || '',
    description: character.description !== undefined ? character.description : character.appearance || '',
    personality: character.personality || '',
    scenario: character.scenario !== undefined ? character.scenario : character.startPlot || '',
    first_mes: character.firstMes !== undefined ? character.firstMes : character.startPrompt || '',
    mes_example: character.mesExample !== undefined ? character.mesExample : character.exampleDialogues || '',
    creator_notes: character.creatorNotes || '',
    system_prompt: character.systemPrompt || '',
    post_history_instructions: character.postHistoryInstructions || '',
    alternate_greetings: character.alternateGreetings || [],
    ...(characterBook ? { character_book: characterBook } : {}),
    tags: character.tags || [],
    creator: character.creator || '',
    character_version: character.characterVersion !== undefined ? character.characterVersion : '1.0',
    extensions: {
      ...character.extensions,
      avatarUrl: character.avatarUrl,
      age: character.age,
      relationshipToPlayer: character.relationshipToPlayer,
      writingStyle: character.writingStyle,
      toneOfVoice: character.toneOfVoice,
      typicalPhrases: character.typicalPhrases,
      playerAddressName: character.playerAddressName,
      addressMode: character.addressMode,
      nicknames: character.nicknames,
      thoughtsEnabled: character.thoughtsEnabled,
      initiativeLevel: character.initiativeLevel,
      plotInitiative: character.plotInitiative,
      pacing: character.pacing,
      flirtBehavior: character.flirtBehavior,
      dominanceLevel: character.dominanceLevel,
      dynamics: character.dynamics,
      humorLevel: character.humorLevel,
      humorStyles: character.humorStyles,
      behaviorRules: character.behaviorRules,
      customInstructions: character.customInstructions,
      imageFrequency: character.imageFrequency,
      imageStyleDescription: character.imageStyleDescription,
    },
  };

  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: v2Data,
  };
}

/**
 * Validate whether an object conforms to CharacterCardV2 format
 */
export function isValidV2Card(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.spec === 'chara_card_v2' && obj.data && typeof obj.data === 'object') {
    return true;
  }
  // Also check direct data payload with required fields
  if (obj.name && (obj.description !== undefined || obj.personality !== undefined || obj.first_mes !== undefined)) {
    return true;
  }
  return false;
}

// Aliases for convenience
export const characterToV2Card = characterToCharacterCardV2;
export const v2CardToCharacter = characterCardV2ToCharacter;
