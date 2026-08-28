import assert from 'node:assert/strict';
import { buildChatPayload, buildStartChatPayload, resolveGreeting, GLOBAL_SYSTEM_PROMPT } from '../src/utils/promptBuilder';
import { characterCardV2ToCharacter, characterToCharacterCardV2 } from '../src/utils/characterCardV2Converter';
import type { CharacterBookEntry } from '../src/types/characterCardV2';
import { defaultDeanPromptFixture } from './fixtures/defaultDeanPromptFixture';

const base = { name: 'Dean', playerAddressName: 'Lidii', description: 'Dean description', personality: 'Dean personality', scenario: 'A library.', mesExample: '{{char}} greets {{user}}.', memories: [], creatorNotes: 'SECRET NOTES', dominanceLevel: 'LEGACY_DOMINANCE', flirtBehavior: 'LEGACY_FLIRT', pacing: 'LEGACY_PACING', writingStyle: 'LEGACY_STYLE', behaviorRules: 'LEGACY_RULES', customInstructions: 'LEGACY_CUSTOM', startBehavior: 'LEGACY_START' };
const cases: Record<string, unknown> = {};
const userEn = 'I look up from my book for a moment, then continue reading.';
const p1 = buildChatPayload({ character: base, language: 'en', messages: [{ role: 'user', content: userEn }] });
assert.deepEqual(p1.chatHistory.at(-1), { role: 'user', content: userEn });
assert.match(p1.messages[0].content, /Generate Dean's next reply in English\./);
assert.doesNotMatch(p1.messages[0].content, /German|LEGACY_|SECRET NOTES/i);
cases.test1 = p1.messages;

const userDe = 'Ich schaue kurz von meinem Buch auf und lese dann weiter.';
const p2 = buildChatPayload({ character: base, language: 'de', messages: [{ role: 'user', content: userDe }] });
assert.deepEqual(p2.chatHistory.at(-1), { role: 'user', content: userDe });
assert.match(p2.messages[0].content, /Generate Dean's next reply in German\./);
assert.doesNotMatch(p2.messages[0].content, /English|LEGACY_/i);
cases.test2 = p2.messages;

const english = { ...base, name: 'EnglishCard', description: 'English description', personality: 'English personality', scenario: 'English scenario', mesExample: '{{char}} says hello.', systemPrompt: 'English system', postHistoryInstructions: 'English post', characterBook: { entries: [{ keys: ['book'], content: 'English lore', enabled: true, insertion_order: 1 }] } };
const p3 = buildChatPayload({ character: english, language: 'de', messages: [{ role: 'user', content: 'book' }] });
for (const text of ['English description','English personality','English scenario','EnglishCard says hello.','English system','English post','English lore']) assert.match(JSON.stringify(p3.messages), new RegExp(text.replace(/[.]/g, '\\.')));
cases.test3 = p3.messages;

const german = { ...base, name: 'DeutschKarte', description: 'Deutsche Beschreibung', personality: 'Deutsche Persönlichkeit', scenario: 'Deutsches Szenario', mesExample: '{{char}} grüßt {{user}}.', systemPrompt: 'Deutsches System', postHistoryInstructions: 'Deutscher Abschluss' };
const p4 = buildChatPayload({ character: german, language: 'en', messages: [{ role: 'user', content: 'Hallo' }] });
for (const text of ['Deutsche Beschreibung','Deutsche Persönlichkeit','Deutsches Szenario','DeutschKarte grüßt Lidii.','Deutsches System','Deutscher Abschluss']) assert.match(JSON.stringify(p4.messages), new RegExp(text));
cases.test4 = p4.messages;

assert.equal(resolveGreeting({ ...base, firstMes: 'Hello {{user}}, {{char}} here.' }), 'Hello Lidii, Dean here.');
assert.equal(resolveGreeting({ ...base, firstMes: 'main', alternateGreetings: ['alt {{char}}'] }, 0), 'alt Dean');
const p7 = buildChatPayload({ character: { ...base, systemPrompt: 'Before\n{{original}}\nAfter' }, language: 'en', messages: [{ role: 'user', content: 'x' }] });
assert.match(p7.systemPrompt, /Before\nWrite Dean's next reply in an immersive roleplay between Dean and Lidii\.\nAfter/);
assert.doesNotMatch(p7.systemPrompt, /{{(?:char|user|original)}}/);
cases.test7 = p7.messages;
const p8 = buildChatPayload({ character: { ...base, postHistoryInstructions: 'Before {{original}} After' }, language: 'en', messages: [{ role: 'user', content: 'x' }] });
assert.equal(p8.postHistoryInstructions, 'Before  After'); cases.test8 = p8.messages;

const loreChar = { ...base, characterBook: { scan_depth: 2, token_budget: 13, entries: [
  { keys: ['dragon'], content: 'wrong old', enabled: true, insertion_order: 0 },
  { keys: ['cat'], secondary_keys: ['moon'], selective: true, content: 'selective lore long', enabled: true, insertion_order: 3, priority: 2 },
  { keys: ['CAT'], content: 'case lore', case_sensitive: true, enabled: true, insertion_order: 2, priority: 1 },
  { keys: [], content: 'constant lore', constant: true, enabled: true, insertion_order: 1, priority: 3, position: 'before_char' },
  { keys: ['cat'], content: 'disabled lore', enabled: false, insertion_order: 4 },
  { keys: ['dog'], content: 'whole mismatch', enabled: true, insertion_order: 5 },
] } };
const p9 = buildChatPayload({ character: loreChar, language: 'en', messages: [{role:'user',content:'dragon'}, {role:'assistant',content:'The cat waits.'}, {role:'user',content:'moon scatters; hotdog.'}] });
assert.deepEqual(p9.activatedCharacterBookEntries.map(e => e.content), ['constant lore','selective lore long']);
assert.doesNotMatch(p9.characterDefinitions, /wrong old|case lore|disabled lore|whole mismatch/); cases.test9 = p9.messages;
assert.doesNotMatch(p1.characterDefinitions, /SECRET NOTES/);

const card: any = { spec:'chara_card_v2', spec_version:'2.0', data:{ name:'Roundtrip', description:'D', personality:'P', scenario:'S', first_mes:'F', mes_example:'M', extensions:{unknown:{a:1}}, character_book:{extensions:{bookUnknown:2},entries:[{keys:['k'],content:'c',enabled:true,insertion_order:1,extensions:{entryUnknown:3}}]}}};
const roundtrip = characterToCharacterCardV2(characterCardV2ToCharacter(card, 'roundtrip'));
assert.deepEqual(roundtrip.data.extensions?.unknown, {a:1});
assert.equal(roundtrip.data.character_book?.extensions?.bookUnknown, 2);
assert.equal(roundtrip.data.character_book?.entries[0].extensions?.entryUnknown, 3);
assert.equal(roundtrip.data.description, 'D'); assert.equal(roundtrip.data.scenario, 'S'); assert.equal(roundtrip.data.first_mes, 'F'); assert.equal(roundtrip.data.mes_example, 'M');
assert.match(p1.characterDefinitions, /Dean greets Lidii\./);
assert.equal(p1.chatHistory.some(m => m.content.includes('greets')), false);

const macroPayload = buildChatPayload({
  character: { ...base, systemPrompt: '{{summary}} | {{example_dialogue}} | {{personality}} | {{scenario}}' },
  storyContext: { sceneSummary: 'Existing scene summary' }, language: 'en', messages: [],
});
assert.match(macroPayload.systemPrompt, /Existing scene summary \| Dean greets Lidii\. \| Dean personality \| A library\./);
assert.doesNotMatch(macroPayload.systemPrompt, /LEGACY_/);

const positioned = buildChatPayload({ character: { ...base, characterBook: { extensions: {}, scan_depth: 1, entries: [
  { keys: [], content: 'BEFORE_LORE', extensions: {}, enabled: true, insertion_order: 2, constant: true, position: 'before_char' },
  { keys: [], content: 'AFTER_LORE', extensions: {}, enabled: true, insertion_order: 1, constant: true, position: 'after_char' },
] } }, messages: [], language: 'en' });
const positionedSystem = positioned.messages[0].content;
assert.ok(positionedSystem.indexOf('BEFORE_LORE') < positionedSystem.indexOf('Dean description'));
assert.ok(positionedSystem.indexOf('AFTER_LORE') > positionedSystem.indexOf('Dean greets Lidii.'));

const zeroDepth = buildChatPayload({ character: { ...base, characterBook: { extensions: {}, scan_depth: 0, entries: [
  { keys: ['dragon'], content: 'SHOULD_NOT_ACTIVATE', extensions: {}, enabled: true, insertion_order: 0 },
] } }, messages: [{ role: 'user', content: 'dragon' }] });
assert.equal(zeroDepth.activatedCharacterBookEntries.length, 0);

const independentDepth = buildChatPayload({ character: { ...base, characterBook: { extensions: {}, scan_depth: 3, entries: [
  { keys: ['old-trigger'], content: 'FOUND_OUTSIDE_PAYLOAD_WINDOW', extensions: {}, enabled: true, insertion_order: 0 },
] } }, contextWindowSize: 1, messages: [
  { role: 'user', content: 'old-trigger' }, { role: 'assistant', content: 'middle' }, { role: 'user', content: 'latest' },
] });
assert.equal(independentDepth.chatHistory.length, 1);
assert.equal(independentDepth.activatedCharacterBookEntries[0]?.content, 'FOUND_OUTSIDE_PAYLOAD_WINDOW');

const recursive = buildChatPayload({ character: { ...base, characterBook: { extensions: {}, scan_depth: 1, recursive_scanning: true, entries: [
  { keys: ['first-key'], content: 'second-key appears here', extensions: {}, enabled: true, insertion_order: 0 },
  { keys: ['second-key'], content: 'RECURSIVE_LORE', extensions: {}, enabled: true, insertion_order: 1 },
] } }, messages: [{ role: 'user', content: 'first-key' }] });
assert.deepEqual(recursive.activatedCharacterBookEntries.map(entry => entry.content), ['second-key appears here', 'RECURSIVE_LORE']);

const legacyOnlyExport = characterToCharacterCardV2({ ...base, id: 'legacy', avatarUrl: '', age: '', appearance: 'A', background: '', relationshipToPlayer: '', toneOfVoice: '', typicalPhrases: '', addressMode: 'auto', nicknames: '', thoughtsEnabled: true, initiativeLevel: 'medium', plotInitiative: 'medium', dynamics: [], humorLevel: 'playful', humorStyles: [], imageFrequency: 'rare', imageStyleDescription: '', memories: [{ id: 'legacy-memory', category: 'detail', content: 'Do not export as lore', createdAt: 1 }], createdAt: 1, updatedAt: 1 } as any);
assert.equal(legacyOnlyExport.data.character_book, undefined);

const imagePayload = buildChatPayload({ character: base, language: 'en', messages: [{ role: 'user', content: 'I look at you.', image: { url: 'data:image/png;base64,x', caption: 'a page' } }] });
assert.deepEqual(imagePayload.messages.slice(1), [
  { role: 'system', content: '[Lidii attached an image/photo: a page]' },
  { role: 'user', content: 'I look at you.' },
]);
assert.deepEqual(imagePayload.messages, [{ role: 'system', content: imagePayload.messages[0].content }, ...imagePayload.chatHistory]);

const defaultDeanPayload = buildChatPayload({ character: defaultDeanPromptFixture, language: 'de', messages: [] });
for (const hiddenLegacyValue of [
  defaultDeanPromptFixture.dominanceLevel, defaultDeanPromptFixture.flirtBehavior,
  defaultDeanPromptFixture.pacing, defaultDeanPromptFixture.writingStyle,
  defaultDeanPromptFixture.behaviorRules, defaultDeanPromptFixture.customInstructions,
  defaultDeanPromptFixture.startBehavior,
]) assert.doesNotMatch(defaultDeanPayload.messages[0].content, new RegExp(hiddenLegacyValue));

const startPayload = buildStartChatPayload({ character: {
  ...base,
  description: 'UNIQUE_DESCRIPTION', personality: 'UNIQUE_PERSONALITY', scenario: 'UNIQUE_SCENARIO',
  mesExample: '{{char}} says UNIQUE_EXAMPLE to {{user}}.', firstMes: '',
  characterBook: { extensions: {}, entries: [{
    keys: [], content: 'UNIQUE_LORE', extensions: {}, enabled: true, insertion_order: 0, constant: true,
  }] },
}, language: 'en' });
for (const expected of ['UNIQUE_DESCRIPTION', 'UNIQUE_PERSONALITY', 'UNIQUE_SCENARIO', 'UNIQUE_EXAMPLE', 'UNIQUE_LORE']) {
  assert.match(startPayload.messages[0].content, new RegExp(expected));
}
assert.doesNotMatch(startPayload.messages[0].content, /LEGACY_/);
assert.equal(startPayload.openingMessage.content, 'Write the opening message as Dean based on the scenario:\n\nUNIQUE_SCENARIO');

const emptyV2Card: any = { spec: 'chara_card_v2', spec_version: '2.0', data: {
  name: 'Empty V2', description: '', personality: 'P', scenario: '', first_mes: '', mes_example: '',
  creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [],
  creator: '', character_version: '', extensions: {
    appearance: 'LEGACY_DESCRIPTION', startPlot: 'LEGACY_SCENARIO', startPrompt: 'LEGACY_FIRST',
    exampleDialogues: 'LEGACY_EXAMPLE', unknownData: { preserved: true },
  },
  character_book: { entries: [{ keys: ['key'], content: 'content', extensions: { unknownEntry: 1 } }], extensions: { unknownBook: 2 } },
} };
const emptyV2Character = characterCardV2ToCharacter(emptyV2Card, 'empty-v2');
const emptyV2Payload = buildChatPayload({ character: emptyV2Character, messages: [], language: 'en' });
assert.doesNotMatch(emptyV2Payload.messages[0].content, /LEGACY_DESCRIPTION|LEGACY_SCENARIO|LEGACY_EXAMPLE/);
assert.equal(resolveGreeting(emptyV2Character), '');
const emptyV2Roundtrip = characterToCharacterCardV2(emptyV2Character);
assert.equal(emptyV2Roundtrip.data.description, '');
assert.equal(emptyV2Roundtrip.data.scenario, '');
assert.equal(emptyV2Roundtrip.data.first_mes, '');
assert.equal(emptyV2Roundtrip.data.mes_example, '');
assert.equal(emptyV2Roundtrip.data.character_version, '');
assert.deepEqual(emptyV2Roundtrip.data.extensions.unknownData, { preserved: true });
assert.deepEqual(emptyV2Roundtrip.data.character_book?.extensions, { unknownBook: 2 });
assert.deepEqual(emptyV2Roundtrip.data.character_book?.entries[0].extensions, { unknownEntry: 1 });
assert.equal(emptyV2Roundtrip.data.character_book?.entries[0].enabled, true);
assert.equal(emptyV2Roundtrip.data.character_book?.entries[0].insertion_order, 0);

const numericIdEntry: CharacterBookEntry = {
  id: 1, keys: [], content: '', extensions: {}, enabled: true, insertion_order: 0,
};
assert.equal(numericIdEntry.id, 1);
// @ts-expect-error Character Card V2 entry IDs are numeric.
const invalidStringId: CharacterBookEntry = { ...numericIdEntry, id: 'not-a-number' };
void invalidStringId;
console.log(JSON.stringify(cases, null, 2));
console.log('All 14 production prompt/converter assertions passed.');

// OpenRouter returns errors in JSON even with HTTP 200. Both primary and fallback must be rejected.
process.env.NODE_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'test-key';
const { generateOpenRouterResponse } = await import('../server');
const originalFetch = globalThis.fetch;
let fetchCalls = 0;
globalThis.fetch = (async () => {
  fetchCalls++;
  return new Response(JSON.stringify({ error: { message: 'Upstream error from Nvidia: Service temporarily overloaded' } }), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;
await assert.rejects(() => generateOpenRouterResponse({ systemPrompt: 'imitate only', messages: [], defaultModel: 'primary' }), /temporarily overloaded/);
assert.equal(fetchCalls, 2, 'primary and fallback were both attempted');
globalThis.fetch = originalFetch;
console.log('HTTP-200 error-object primary/fallback assertion passed; no result was accepted.');
