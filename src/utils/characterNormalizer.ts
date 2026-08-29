import type { Character } from '../types';

const OLD_DEAN_OCCUPATION_DE = /Lidii arbeitet als Bibliothekarin\.\s*/g;
const OLD_DEAN_OCCUPATION_EN = /Lidii works as a librarian\.\s*/gi;

function cleanDeanLegacyText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value
    .replace(OLD_DEAN_OCCUPATION_DE, '')
    .replace(OLD_DEAN_OCCUPATION_EN, '')
    .replace(/vor deinem Schreibtisch/g, 'vor deinem Tisch')
    .replace(/in front of your desk/gi, 'in front of your table');
}

/**
 * Removes only known text from the old bundled Dean default that incorrectly fixed
 * {{user}}'s occupation as a librarian. This is deliberately narrow so imported
 * characters and user-authored edits are never generically rewritten.
 */
export function migrateKnownDefaultCharacterArtifacts(character: Character): Character {
  if (character.id !== 'char-dean') return character;

  return {
    ...character,
    appearance: cleanDeanLegacyText(character.appearance) || '',
    relationshipToPlayer: cleanDeanLegacyText(character.relationshipToPlayer) || '',
    description: cleanDeanLegacyText(character.description),
    firstMes: cleanDeanLegacyText(character.firstMes),
    startPrompt: cleanDeanLegacyText(character.startPrompt),
  };
}

/**
 * Compatibility bridge for characters created by older ChatApp versions.
 * Legacy profile text is consolidated into visible Character Card V2 fields
 * before it reaches the V2-centric production prompt builder.
 */
export function normalizeLegacyCharacterToV2(character: Character): Character {
  const cleaned = migrateKnownDefaultCharacterArtifacts(character);
  const hasDirectV2Fields =
    cleaned.description !== undefined ||
    cleaned.scenario !== undefined ||
    cleaned.firstMes !== undefined ||
    cleaned.mesExample !== undefined;

  if (hasDirectV2Fields) return cleaned;

  const descriptionSections = [
    cleaned.appearance,
    cleaned.background ? `Background:\n${cleaned.background}` : '',
    cleaned.relationshipToPlayer
      ? `Relationship / prior context with {{user}}:\n${cleaned.relationshipToPlayer}`
      : '',
    cleaned.writingStyle ? `Writing style:\n${cleaned.writingStyle}` : '',
    cleaned.toneOfVoice ? `Voice / tone:\n${cleaned.toneOfVoice}` : '',
    cleaned.typicalPhrases ? `Typical speech examples:\n${cleaned.typicalPhrases}` : '',
    cleaned.startBehavior ? `Behavior:\n${cleaned.startBehavior}` : '',
    cleaned.dynamics?.length ? `Relationship / role dynamics:\n${cleaned.dynamics.join(', ')}` : '',
    cleaned.humorStyles?.length ? `Humor / tonal traits:\n${cleaned.humorStyles.join(', ')}` : '',
    cleaned.dominanceLevel ? `Legacy interpersonal style: ${cleaned.dominanceLevel}` : '',
    cleaned.pacing ? `Legacy pacing preference: ${cleaned.pacing}` : '',
    cleaned.flirtBehavior ? `Legacy flirt behavior: ${cleaned.flirtBehavior}` : '',
    cleaned.plotInitiative || cleaned.initiativeLevel
      ? `Legacy plot initiative: ${cleaned.plotInitiative || cleaned.initiativeLevel}`
      : '',
  ].filter(Boolean);

  const legacyInstructions = [cleaned.behaviorRules, cleaned.customInstructions]
    .filter(value => typeof value === 'string' && value.trim())
    .join('\n\n');

  return {
    ...cleaned,
    description: descriptionSections.join('\n\n'),
    scenario: cleaned.startPlot || '',
    firstMes: cleaned.startPrompt || '',
    mesExample: cleaned.exampleDialogues || '',
    postHistoryInstructions:
      cleaned.postHistoryInstructions !== undefined
        ? cleaned.postHistoryInstructions
        : legacyInstructions,
  };
}
