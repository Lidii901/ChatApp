import assert from 'node:assert/strict';
import { buildChatPayload } from '../src/utils/promptBuilder';

const base = {
  name: 'GenericCharacter',
  playerAddressName: 'User',
  description: 'Eine deutsch geschriebene Beschreibung.',
  personality: 'Ruhig und aufmerksam.',
  scenario: 'Eine deutsch beschriebene Szene.',
  mesExample: '<START>\n{{user}}: Hallo\n{{char}}: Guten Abend.',
};

// A German card and German post-history must not be allowed to override an EN chat.
const englishWithGermanCard = buildChatPayload({
  character: {
    ...base,
    postHistoryInstructions: 'Antworte atmosphärisch und bleibe in der Rolle.',
  },
  language: 'en',
  messages: [{ role: 'user', content: 'I look at you.' }],
});
assert.match(englishWithGermanCard.messages[0].content, /Generate GenericCharacter's next reply in English\./);
assert.match(englishWithGermanCard.messages[0].content, /FINAL OUTPUT LANGUAGE: Write the entire next reply in English only\./);
const trailing = englishWithGermanCard.messages.at(-1)!;
assert.equal(trailing.role, 'system');
assert.match(trailing.content, /Antworte atmosphärisch/);
assert.match(trailing.content, /FINAL OUTPUT LANGUAGE: Write the entire next reply in English only\./);

// Cards without post-history keep a compact payload and still get the final language guard.
const englishWithoutPost = buildChatPayload({
  character: base,
  language: 'en',
  messages: [{ role: 'user', content: 'Continue.' }],
});
assert.equal(englishWithoutPost.messages.length, 2);
assert.match(englishWithoutPost.messages[0].content, /FINAL OUTPUT LANGUAGE: Write the entire next reply in English only\./);

// Chat Memory is additional context even if the card did not explicitly place {{summary}}.
const automaticMemory = buildChatPayload({
  character: base,
  language: 'en',
  storyContext: { sceneSummary: 'They have just met and have never spoken before.' },
  messages: [],
});
assert.match(automaticMemory.messages[0].content, /Chat Memory:\nThey have just met and have never spoken before\./);

// If the card explicitly places {{summary}}, do not duplicate the same summary as automatic memory.
const placedMemory = buildChatPayload({
  character: { ...base, systemPrompt: 'Memory placement: {{summary}}' },
  language: 'en',
  storyContext: { sceneSummary: 'UNIQUE_SUMMARY' },
  messages: [],
});
assert.equal((placedMemory.messages[0].content.match(/UNIQUE_SUMMARY/g) || []).length, 1);

// Chub {{memory}} means activated lorebook content, not the app's old manual memory-note array.
const loreMacro = buildChatPayload({
  character: {
    ...base,
    systemPrompt: 'Activated lore: {{memory}}',
    characterBook: {
      extensions: {},
      scan_depth: 2,
      entries: [{
        keys: ['library'],
        content: 'LORE_FROM_CHARACTER_BOOK',
        extensions: {},
        enabled: true,
        insertion_order: 0,
      }],
    },
  },
  language: 'en',
  storyContext: {
    memories: [{ id: 'legacy', category: 'detail', content: 'LEGACY_APP_MEMORY', createdAt: 1 }],
  },
  messages: [{ role: 'user', content: 'We are in the library.' }],
});
assert.match(loreMacro.messages[0].content, /LORE_FROM_CHARACTER_BOOK/);
assert.doesNotMatch(loreMacro.messages[0].content, /LEGACY_APP_MEMORY/);
assert.equal((loreMacro.messages[0].content.match(/LORE_FROM_CHARACTER_BOOK/g) || []).length, 1);

console.log('Chub language, memory and lore regression assertions passed.');
