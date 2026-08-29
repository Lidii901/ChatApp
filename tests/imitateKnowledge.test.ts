import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const { buildImitateSystemPrompt, buildImitateUserPrompt } = await import('../server');

const technicalOnlyCharacter: any = {
  id: 'char-test',
  name: 'SECRET_TECHNICAL_NAME',
  playerAddressName: 'Player',
  description: 'A tall person in a dark coat.',
  scenario: '',
};

const emptyContext = {
  currentScene: 'A quiet room.',
  sceneSummary: '',
  keyEvents: [],
  memories: [],
};

const englishSystem = buildImitateSystemPrompt(
  technicalOnlyCharacter,
  emptyContext,
  [],
  'en',
  ''
);
const englishUserPrompt = buildImitateUserPrompt(
  technicalOnlyCharacter,
  [{ role: 'character', content: 'Good evening. I know your name.' }],
  'en',
  10
);

assert.equal(
  englishSystem.includes('SECRET_TECHNICAL_NAME'),
  false,
  'Technical Character Card name must not leak into Imitate Me as player knowledge when continuity does not establish it.'
);
assert.equal(
  englishUserPrompt.includes('SECRET_TECHNICAL_NAME'),
  false,
  'Conversation speaker labels must stay generic and must not expose the technical character name.'
);
assert.match(englishSystem, /does NOT prove reciprocal familiarity/i);
assert.match(englishSystem, /do not invent it/i);
assert.match(englishUserPrompt, /do not invent prior familiarity/i);

const establishedRelationshipCharacter: any = {
  ...technicalOnlyCharacter,
  scenario: '{{user}} and {{char}} have been close friends for five years.',
};
const establishedSystem = buildImitateSystemPrompt(
  establishedRelationshipCharacter,
  emptyContext,
  [],
  'en',
  ''
);
assert.match(establishedSystem, /Player and SECRET_TECHNICAL_NAME have been close friends for five years\./);
assert.match(establishedSystem, /Scenario:/);

const firstContactCharacter: any = {
  ...technicalOnlyCharacter,
  scenario: '{{user}} meets {{char}} for the first time tonight.',
};
const firstContactSystem = buildImitateSystemPrompt(
  firstContactCharacter,
  emptyContext,
  [],
  'en',
  ''
);
assert.match(firstContactSystem, /Player meets SECRET_TECHNICAL_NAME for the first time tonight\./);

const germanSystem = buildImitateSystemPrompt(
  technicalOnlyCharacter,
  emptyContext,
  [],
  'de',
  ''
);
assert.match(germanSystem, /beweist NICHT/i);
assert.match(germanSystem, /erfinde (?:ihn|sie) nicht/i);

const loreSystem = buildImitateSystemPrompt(
  technicalOnlyCharacter,
  emptyContext,
  [],
  'en',
  '{{char}} owns a hidden archive.',
);
assert.match(loreSystem, /SECRET_TECHNICAL_NAME owns a hidden archive\./);
assert.match(loreSystem, /unobserved information.*not automatically/i);

console.log('Imitate Me knowledge-boundary regression assertions passed.');
