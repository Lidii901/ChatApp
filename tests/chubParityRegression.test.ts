import assert from 'node:assert/strict';
import {
  activateCharacterBook,
  buildChatPayload,
  packRawHistoryToTokenBudget,
} from '../src/utils/promptBuilder';
import { characterCardV2ToCharacter, characterToCharacterCardV2 } from '../src/utils/characterCardV2Converter';

const base: any = {
  name: 'Character',
  playerAddressName: 'Player',
  description: 'Description for {{char}} and {{user}}.',
  personality: 'Observant.',
  scenario: 'Current scenario.',
  mesExample: '',
};

// History is retained by token budget as a chronological suffix, not by a fixed message count.
const longHistory = Array.from({ length: 30 }, (_, index) => ({
  role: index % 2 ? 'character' : 'lidii',
  content: `message-${index}-${'x'.repeat(180)}`,
}));
const packed = packRawHistoryToTokenBudget(longHistory, 500);
assert.ok(packed.kept.length > 0 && packed.kept.length < longHistory.length);
assert.equal(packed.kept.at(-1)?.content, longHistory.at(-1)?.content);
assert.equal(packed.dropped.length + packed.kept.length, longHistory.length);
assert.ok(packed.kept.length > 2, 'Token packing must not behave like an arbitrary tiny fixed-message cutoff.');

// Character's Note / depth_prompt is injected at the requested chat-history depth.
const notePayload = buildChatPayload({
  character: { ...base, characterNote: 'CHAR_NOTE {{user}}', characterNoteDepth: 1, characterNoteRole: 'system' },
  messages: [
    { role: 'lidii', content: 'one' },
    { role: 'character', content: 'two' },
    { role: 'lidii', content: 'three' },
  ],
  language: 'en',
  promptConfig: { contextSizeTokens: 8192, maxOutputTokens: 512 },
});
assert.equal(notePayload.chatHistory.at(-2)?.role, 'system');
assert.equal(notePayload.chatHistory.at(-2)?.content, 'CHAR_NOTE Player');
assert.equal(notePayload.characterNote, 'CHAR_NOTE Player');

// Prompt Note and Assistant Prefill are real prompt messages, not decorative settings.
const configPayload = buildChatPayload({
  character: base,
  messages: [{ role: 'lidii', content: 'Continue.' }],
  language: 'en',
  storyContext: { profile: 'PLAYER_PROFILE', currentScene: 'CURRENT_SCENE', sceneSummary: 'SUMMARY' },
  promptConfig: {
    contextSizeTokens: 8192,
    maxOutputTokens: 512,
    promptNote: 'NOTE {{profile}} / {{summary}}',
    promptNoteDepth: 0,
    promptNoteRole: 'system',
    assistantPrefill: 'PREFILL:',
  },
});
assert.ok(configPayload.messages.some(message => message.role === 'system' && message.content === 'NOTE PLAYER_PROFILE / SUMMARY'));
assert.deepEqual(configPayload.messages.at(-1), { role: 'assistant', content: 'PREFILL:' });
assert.equal(configPayload.promptNote, 'NOTE PLAYER_PROFILE / SUMMARY');
assert.equal(configPayload.assistantPrefill, 'PREFILL:');
assert.match(configPayload.messages[0].content, /Current Scene:\nCURRENT_SCENE/);

// Character-definition macros are expanded in the actual definition text.
assert.match(configPayload.characterDefinitions, /Description for Character and Player\./);

// Selective lore supports AND/NOT-style logic and deterministic probability.
const selectiveBook: any = {
  extensions: {},
  scan_depth: 4,
  entries: [
    {
      keys: ['apple'], secondary_keys: ['banana'], selective: true, selectiveLogic: 'not_any',
      content: 'NO_BANANA', enabled: true, insertion_order: 0, extensions: {},
    },
    {
      keys: ['apple'], content: 'PROBABILITY', probability: 50, useProbability: true,
      enabled: true, insertion_order: 1, extensions: {},
    },
  ],
};
const appleOnly = activateCharacterBook(selectiveBook, [{ role: 'user', content: 'apple' }], { random: () => 0.49 });
assert.deepEqual(appleOnly.map(entry => entry.content), ['NO_BANANA', 'PROBABILITY']);
const appleBanana = activateCharacterBook(selectiveBook, [{ role: 'user', content: 'apple banana' }], { random: () => 0.5 });
assert.deepEqual(appleBanana.map(entry => entry.content), []);

// Per-chat lore Scan Depth and Token Budget overrides take precedence over book defaults.
const overrideBook: any = {
  extensions: {},
  scan_depth: 5,
  token_budget: 1000,
  entries: [
    { keys: ['oldkey'], content: 'OLD_LORE', enabled: true, insertion_order: 0, priority: 1, extensions: {} },
    { constant: true, keys: [], content: 'A'.repeat(80), enabled: true, insertion_order: 1, priority: 1, extensions: {} },
    { constant: true, keys: [], content: 'B'.repeat(80), enabled: true, insertion_order: 2, priority: 9, extensions: {} },
  ],
};
const overridden = activateCharacterBook(
  overrideBook,
  [{ role: 'user', content: 'oldkey' }, { role: 'assistant', content: 'latest' }],
  { scanDepthOverride: 1, tokenBudgetOverride: 25, random: () => 0 },
);
assert.doesNotMatch(overridden.map(entry => entry.content).join('\n'), /OLD_LORE/);
assert.ok(overridden.some(entry => entry.content.startsWith('B')), 'Higher-priority lore should survive a tight token budget.');

// Common Chub depth_prompt extension is surfaced and round-trips without deleting unknown data.
const imported = characterCardV2ToCharacter({
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: 'Depth', description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
    creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [],
    tags: [], creator: '', character_version: '1.0',
    extensions: { depth_prompt: { prompt: 'DEPTH_PROMPT', depth: 3, role: 'user', keepMe: true }, untouched: 42 },
  },
} as any);
assert.equal(imported.characterNote, 'DEPTH_PROMPT');
assert.equal(imported.characterNoteDepth, 3);
assert.equal(imported.characterNoteRole, 'user');
const exported = characterToCharacterCardV2(imported);
assert.equal((exported.data.extensions.depth_prompt as any).prompt, 'DEPTH_PROMPT');
assert.equal((exported.data.extensions.depth_prompt as any).keepMe, true);
assert.equal(exported.data.extensions.untouched, 42);

console.log('Chub prompt/context/lore parity regression assertions passed.');
