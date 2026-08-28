import assert from 'node:assert/strict';
import { normalizeLegacyCharacterToV2 } from '../src/utils/characterNormalizer';

const legacy: any = {
  id: 'legacy-char',
  name: 'Legacy',
  avatarUrl: '',
  age: '30',
  appearance: 'Tall, dark coat.',
  personality: 'Reserved.',
  background: 'Old background text.',
  relationshipToPlayer: 'Has never spoken to {{user}} before.',
  writingStyle: 'Sparse prose.',
  toneOfVoice: 'Low and calm.',
  typicalPhrases: 'Stay here.',
  playerAddressName: 'User',
  thoughtsEnabled: true,
  initiativeLevel: 'medium',
  plotInitiative: 'low',
  pacing: 'slow_burn',
  flirtBehavior: 'subtle',
  dominanceLevel: 'level_4_confident',
  dynamics: ['Switch'],
  humorStyles: ['Dry'],
  behaviorRules: 'Do not invent user actions.',
  customInstructions: 'Keep continuity exact.',
  startPlot: 'A first meeting in a train station.',
  startBehavior: 'Keeps a polite distance.',
  startPrompt: 'Hello, {{user}}.',
  exampleDialogues: '<START>\n{{char}}: Hello.',
  memories: [],
  createdAt: 1,
  updatedAt: 1,
};

const migrated = normalizeLegacyCharacterToV2(legacy);
assert.match(migrated.description || '', /Tall, dark coat\./);
assert.match(migrated.description || '', /Old background text\./);
assert.match(migrated.description || '', /Has never spoken to \{\{user\}\} before\./);
assert.match(migrated.description || '', /Sparse prose\./);
assert.match(migrated.description || '', /Low and calm\./);
assert.match(migrated.description || '', /Keeps a polite distance\./);
assert.equal(migrated.scenario, legacy.startPlot);
assert.equal(migrated.firstMes, legacy.startPrompt);
assert.equal(migrated.mesExample, legacy.exampleDialogues);
assert.match(migrated.postHistoryInstructions || '', /Do not invent user actions\./);
assert.match(migrated.postHistoryInstructions || '', /Keep continuity exact\./);

const directV2 = {
  ...legacy,
  description: '',
  scenario: '',
  firstMes: '',
  mesExample: '',
  postHistoryInstructions: '',
};
const preserved = normalizeLegacyCharacterToV2(directV2);
assert.equal(preserved.description, '');
assert.equal(preserved.scenario, '');
assert.equal(preserved.firstMes, '');
assert.equal(preserved.mesExample, '');
assert.equal(preserved.postHistoryInstructions, '');

console.log('Legacy character to Character Card V2 migration assertions passed.');
