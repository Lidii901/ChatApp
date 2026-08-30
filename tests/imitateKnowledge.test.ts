import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const { buildImitateSystemPrompt, buildImitateUserPrompt, extractGreetingLocalizationOutput } = await import('../server');

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
assert.match(englishSystem, /does NOT prove that the player knows this/i);
assert.match(englishSystem, /do not invent prior familiarity/i);
assert.match(englishUserPrompt, /do not invent prior familiarity/i);
assert.match(englishSystem, /Default to first-person singular/i);
assert.match(englishSystem, /private thoughts, internal narration, unseen actions/i);
assert.match(englishUserPrompt, /private thoughts, internal narration, unseen actions/i);
assert.match(englishUserPrompt, /certainty about hidden actions/i);
assert.match(englishSystem, /Unconfirmed unease, nervousness, curiosity, suspicion or attraction/i);
assert.match(englishUserPrompt, /subjective unease, curiosity, suspicion or attraction/i);
assert.match(englishSystem, /internet RP style/i);
assert.match(englishSystem, /Don't describe actions of the other character/i);
assert.match(englishSystem, /Preserve already established objective scene state/i);
assert.match(englishSystem, /open\/closed, position or posture, held\/placed objects/i);
assert.match(englishUserPrompt, /already established physical scene state/i);
assert.match(englishSystem, /CONTINUATION: Write a new player turn/i);
assert.match(englishSystem, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);

const gatsbyCharacterTurn = 'The spine of The Great Gatsby presses into your palm as you slide it into place on the shelf.';
const gatsbyImitatePrompt = buildImitateUserPrompt(
  technicalOnlyCharacter,
  [{ role: 'character', content: gatsbyCharacterTurn }],
  'en',
  10
);
assert.equal(
  gatsbyImitatePrompt.split(gatsbyCharacterTurn).length - 1,
  1,
  'The latest CHARACTER message must appear only once in the Imitate Me input instead of being duplicated near the task instruction.'
);
assert.doesNotMatch(gatsbyImitatePrompt, /OTHER CHARACTER'S LAST ACTION\/WORDS/i);
assert.match(gatsbyImitatePrompt, /React as Player to the existing history and write something new/i);
assert.match(gatsbyImitatePrompt, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);

const styledSystem = buildImitateSystemPrompt(
  technicalOnlyCharacter,
  emptyContext,
  ['She folds her arms and looks toward the door.'],
  'en',
  ''
);
assert.match(styledSystem, /Match the player perspective actually established by the style examples/i);
assert.doesNotMatch(styledSystem, /There are no player writing-style examples yet/i);

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
assert.match(germanSystem, /Erfinde keine frühere Bekanntschaft/i);
assert.match(germanSystem, /Bewahre bereits etablierte objektive Szenenzustände/i);
assert.match(germanSystem, /FORTSETZUNG: Schreibe einen neuen Spielerzug/i);
assert.match(germanSystem, /paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT/i);

const loreSystem = buildImitateSystemPrompt(
  technicalOnlyCharacter,
  emptyContext,
  [],
  'en',
  '{{char}} owns a hidden archive.',
);
assert.match(loreSystem, /SECRET_TECHNICAL_NAME owns a hidden archive\./);
assert.match(loreSystem, /Hidden details.*NOT automatically known/i);

assert.equal(
  extractGreetingLocalizationOutput('<greeting>The rain falls.\n\n*Quiet.*</greeting>'),
  'The rain falls.\n\n*Quiet.*'
);
assert.throws(
  () => extractGreetingLocalizationOutput('We need to translate the German greeting into English, preserving punctuation. Thus final English follows.'),
  /analysis instead of the translated greeting/i
);

console.log('Imitate Me knowledge-boundary regression assertions passed.');
