import type { Character } from '../types';

/**
 * Compatibility bridge for characters created by older ChatApp versions.
 * Legacy profile text is consolidated into visible Character Card V2 fields
 * before it reaches the V2-centric production prompt builder.
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
