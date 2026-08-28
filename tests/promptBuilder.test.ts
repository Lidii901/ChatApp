import assert from 'node:assert/strict';
import { buildChatPayload, resolveGreeting, GLOBAL_SYSTEM_PROMPT } from '../src/utils/promptBuilder';
import { characterCardV2ToCharacter, characterToCharacterCardV2 } from '../src/utils/characterCardV2Converter';

const base = { name: 'Dean', playerAddressName: 'Lidii', description: 'Dean description', personality: 'Dean personality', scenario: 'A library.', mesExample: '{{char}} greets {{user}}.', memories: [], creatorNotes: 'SECRET NOTES', dominanceLevel: 'level_9_extremely_dominant', flirtBehavior: 'intense', pacing: 'slow_burn' };
const cases: Record<string, unknown> = {};
const userEn = 'I look up from my book for a moment, then continue reading.';
const p1 = buildChatPayload({ character: base, language: 'en', messages: [{ role: 'user', content: userEn }] });
assert.deepEqual(p1.chatHistory.at(-1), { role: 'user', content: userEn });
assert.match(p1.messages[0].content, /Generate Dean's next reply in English\./);
assert.doesNotMatch(p1.messages[0].content, /German|Dominance|Flirt|Slow Burn|SECRET NOTES/i);
cases.test1 = p1.messages;

const userDe = 'Ich schaue kurz von meinem Buch auf und lese dann weiter.';
const p2 = buildChatPayload({ character: base, language: 'de', messages: [{ role: 'user', content: userDe }] });
assert.deepEqual(p2.chatHistory.at(-1), { role: 'user', content: userDe });
assert.match(p2.messages[0].content, /Generate Dean's next reply in German\./);
assert.doesNotMatch(p2.messages[0].content, /English|Dominance|Flirt|Slow Burn/i);
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
assert.match(p7.systemPrompt, new RegExp(`Before\\n${GLOBAL_SYSTEM_PROMPT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\nAfter`));
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
