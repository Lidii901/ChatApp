import assert from 'node:assert/strict';
import {
  migrateKnownDefaultCharacterArtifacts,
  normalizeLegacyCharacterToV2,
} from '../src/utils/characterNormalizer';

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

const oldDeanPersonality = 'Dominant, selbstbewusst, direkt, analytisch, ruhig unter Druck, aufmerksam, eigeninitiativ. Er besitzt eine unerschütterliche Präsenz, spricht überlegt und trocken, und lässt Situationen organisch entstehen, ohne Lidii Handlungen oder Gefühle vorzuschreiben.';
const oldDeanStartBehavior = 'Dean beobachtet Lidii mit ruhiger, berechnender Dominanz und scharfem Blick. Er bleibt souverän, spricht tief und fordernd, lässt ihr aber vollen Raum zum Agieren und Reagieren, ohne sie körperlich einzuengen.';
const oldDeanPostHistory = 'Schreibe ausschliesslich aus Deans Ich-Perspektive. Keine erfundenen Gefühle, Gedanken oder unbeschriebenen Manierismen für Lidii. Reine sensorische Beobachtung. Keine Meta-Spannungsfloskeln. Keine Warte-Endformeln. Schweizer Rechtschreibung mit «ss».';
const oldDeanExampleAction = 'Ich bleibe am Tisch sitzen und blättere ruhig eine Seite meines eigenen Buches um. Der Schein der Schreibtischlampe wirft lange Schatten über das Holz. Als ich das Kapitel beendet habe, klappe ich den Einband zu und stecke den Notizstift in meine Jackentasche.';

const oldDean: any = {
  ...legacy,
  id: 'char-dean',
  name: 'Dean',
  appearance: 'Dark coat. Lidii arbeitet als Bibliothekarin. Quiet presence.',
  personality: oldDeanPersonality,
  relationshipToPlayer: 'Lidii arbeitet als Bibliothekarin. Dean has only observed her from afar.',
  description: `Appearance: dark coat.\n\nRelationship / prior context with {{user}}:\nLidii arbeitet als Bibliothekarin. Dean has only observed her from afar.\n\nBehavior:\n${oldDeanStartBehavior}\n\nLegacy plot initiative: medium`,
  startBehavior: oldDeanStartBehavior,
  postHistoryInstructions: oldDeanPostHistory,
  firstMes: 'Ich blieb einige Schritte vor deinem Schreibtisch stehen.',
  startPrompt: 'Ich blieb einige Schritte vor deinem Schreibtisch stehen.',
  mesExample: `<START>\n{{char}}: ${oldDeanExampleAction}`,
  exampleDialogues: `<START>\n{{char}}: ${oldDeanExampleAction}`,
  initiativeLevel: 'medium',
  plotInitiative: 'medium',
};
const cleanedDean = migrateKnownDefaultCharacterArtifacts(oldDean);
assert.doesNotMatch(cleanedDean.description || '', /Bibliothekarin/);
assert.doesNotMatch(cleanedDean.relationshipToPlayer || '', /Bibliothekarin/);
assert.doesNotMatch(cleanedDean.appearance || '', /Bibliothekarin/);
assert.match(cleanedDean.firstMes || '', /vor deinem Tisch stehen/);
assert.match(cleanedDean.startPrompt || '', /vor deinem Tisch stehen/);
assert.match(cleanedDean.personality || '', /treibt Szenen durch eigene plausible Entscheidungen/);
assert.match(cleanedDean.description || '', /selbstständig situative Initiative/);
assert.match(cleanedDean.description || '', /Plot initiative: high/);
assert.match(cleanedDean.postHistoryInstructions || '', /Dean handelt eigeninitiativ/);
assert.match(cleanedDean.postHistoryInstructions || '', /keine konkrete Offscreen-Tatsache/);
assert.match(cleanedDean.mesExample || '', /ziehe den freien Stuhl/);
assert.equal(cleanedDean.initiativeLevel, 'high');
assert.equal(cleanedDean.plotInitiative, 'high');

const unrelatedCharacter = { ...oldDean, id: 'some-other-dean' };
const untouched = migrateKnownDefaultCharacterArtifacts(unrelatedCharacter);
assert.match(untouched.description || '', /Bibliothekarin/);
assert.match(untouched.firstMes || '', /Schreibtisch/);
assert.equal(untouched.personality, oldDeanPersonality);
assert.equal(untouched.initiativeLevel, 'medium');

console.log('Legacy character to Character Card V2 migration assertions passed.');
