import type { CharacterBook, CharacterBookEntry } from '../types/characterCardV2';

export type PromptMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const GLOBAL_SYSTEM_PROMPT = "Write {{char}}'s next reply in an immersive roleplay between {{char}} and {{user}}.";
export const GLOBAL_POST_HISTORY = '';

export function applyPromptMacros(template: string, values: Record<string, string | undefined>): string {
  // Expand original once first, so macros contained by the original text are resolved below.
  let result = (template || '').replace(/{{original}}/gi, values.original ?? '');
  const supported = ['char', 'user', 'personality', 'scenario', 'memory', 'example_dialogue', 'summary', 'profile'];
  return supported.reduce(
    (text, macro) => text.replace(new RegExp(`{{${macro}}}`, 'gi'), values[macro] ?? ''),
    result,
  );
}

function matchesWholeWord(text: string, keyword: string, caseSensitive: boolean): boolean {
  if (!keyword.trim()) return false;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, caseSensitive ? 'u' : 'iu').test(text);
}

export interface ActivatedLoreEntry extends CharacterBookEntry {
  insertion_order: number;
  priority: number;
}

/** Internal approximate token estimate; not model-specific tokenization or a Chub-defined exact token count. */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function entryMatches(entry: CharacterBookEntry, text: string): boolean {
  const sensitive = entry.case_sensitive === true;
  const primary = (entry.keys || []).some(key => matchesWholeWord(text, String(key), sensitive));
  const secondary = (entry.secondary_keys || []).some(key => matchesWholeWord(text, String(key), sensitive));
  return entry.constant === true || (primary && (!entry.selective || secondary));
}

export function activateCharacterBook(book: CharacterBook | undefined, history: PromptMessage[]): ActivatedLoreEntry[] {
  if (!book?.entries?.length) return [];
  const depth = Number.isInteger(book.scan_depth) && (book.scan_depth as number) >= 0 ? book.scan_depth as number : 4;
  const scanText = depth === 0 ? '' : history.slice(-depth).map(message => message.content).join('\n');
  const active: ActivatedLoreEntry[] = [];
  const activatedIndexes = new Set<number>();
  let recursiveText = scanText;

  do {
    const newlyActivated: Array<{ entry: CharacterBookEntry; index: number }> = [];
    book.entries.forEach((entry, index) => {
      if (activatedIndexes.has(index) || !entry?.content?.trim() || entry.enabled === false) return;
      if (!entryMatches(entry, recursiveText)) return;
      newlyActivated.push({ entry, index });
    });
    newlyActivated.forEach(({ entry, index }) => {
      activatedIndexes.add(index);
      active.push({ ...entry, insertion_order: entry.insertion_order ?? index, priority: entry.priority ?? 0 });
      recursiveText += `\n${entry.content}`;
    });
    if (!book.recursive_scanning || newlyActivated.length === 0) break;
  } while (activatedIndexes.size < book.entries.length);

  const budget = book.token_budget;
  if (typeof budget === 'number' && budget >= 0) {
    while (active.reduce((sum, entry) => sum + approximateTokens(entry.content), 0) > budget && active.length) {
      const lowest = Math.min(...active.map(entry => entry.priority));
      const removal = active.map((entry, index) => ({ entry, index })).filter(x => x.entry.priority === lowest).at(-1)!;
      active.splice(removal.index, 1);
    }
  }
  return active.sort((a, b) => a.insertion_order - b.insertion_order);
}

function cardValue(character: any, authoritative: string, legacy: string): string {
  return String(character?.[authoritative] || character?.[legacy] || '').trim();
}

function macroValues(character: any, storyContext: any = {}) {
  const char = character?.name?.trim() || 'Character';
  const user = character?.playerAddressName?.trim() || 'User';
  const example = applyPromptMacros(cardValue(character, 'mesExample', 'exampleDialogues'), { char, user });
  const memory = Array.isArray(storyContext?.memories)
    ? storyContext.memories.map((item: any) => item?.content).filter(Boolean).join('\n')
    : '';
  return {
    char, user,
    personality: String(character?.personality || ''),
    scenario: cardValue(character, 'scenario', 'startPlot'),
    example_dialogue: example,
    summary: String(storyContext?.sceneSummary || ''),
    memory,
    profile: String(storyContext?.profile || ''),
  };
}

export function resolveSystemPrompt(character: any, language: 'de' | 'en', storyContext?: any): string {
  const values = macroValues(character, storyContext);
  const raw = character?.systemPrompt?.trim() || GLOBAL_SYSTEM_PROMPT;
  const resolved = applyPromptMacros(raw, { ...values, original: GLOBAL_SYSTEM_PROMPT });
  const languageInstruction = language === 'en'
    ? `Generate ${values.char}'s next reply in English.`
    : `Generate ${values.char}'s next reply in German.`;
  return `${resolved.trim()}\n${languageInstruction}`;
}

export function resolvePostHistory(character: any, storyContext?: any): string {
  return applyPromptMacros(character?.postHistoryInstructions?.trim() || GLOBAL_POST_HISTORY, {
    ...macroValues(character, storyContext), original: GLOBAL_POST_HISTORY,
  }).trim();
}

export function buildCharacterDefinitions(character: any): string {
  const values = macroValues(character);
  return [
    cardValue(character, 'description', 'appearance'),
    values.personality,
    values.scenario,
    values.example_dialogue,
  ].filter(Boolean).join('\n\n');
}

function formatHistory(messages: any[], language: 'de' | 'en', playerAddress: string): PromptMessage[] {
  return messages.flatMap(message => {
    const role = message.role === 'lidii' || message.role === 'user' ? 'user' : message.role === 'system' ? 'system' : 'assistant';
    const result: PromptMessage[] = [];
    if (role === 'user' && message.image?.url) {
      const caption = message.image.caption ? `: ${message.image.caption}` : '';
      result.push({ role: 'system', content: language === 'de'
        ? `[${playerAddress} hat ein Bild/Foto angehängt${caption}]`
        : `[${playerAddress} attached an image/photo${caption}]` });
    }
    result.push({ role, content: String(message.content ?? '') });
    return result;
  });
}

export function buildChatPayload(input: {
  character: any; messages: any[]; storyContext?: any; language?: 'de' | 'en'; contextWindowSize?: number;
}) {
  const { character, language = 'de', storyContext } = input;
  const playerAddress = character?.playerAddressName?.trim() || 'User';
  const fullHistory = formatHistory(input.messages || [], language, playerAddress);
  const loreScanHistory = fullHistory.filter(message => message.role !== 'system');
  const activatedCharacterBookEntries = activateCharacterBook(character?.characterBook, loreScanHistory);
  const contextWindowSize = input.contextWindowSize || 12;
  const history = formatHistory((input.messages || []).slice(-contextWindowSize), language, playerAddress);
  const systemPrompt = resolveSystemPrompt(character, language, storyContext);
  const characterDefinitions = buildCharacterDefinitions(character);
  const beforeLore = activatedCharacterBookEntries.filter(entry => entry.position === 'before_char').map(entry => entry.content.trim()).join('\n\n');
  const afterLore = activatedCharacterBookEntries.filter(entry => entry.position !== 'before_char').map(entry => entry.content.trim()).join('\n\n');
  const postHistoryInstructions = resolvePostHistory(character, storyContext);
  const systemContent = [systemPrompt, beforeLore, characterDefinitions, afterLore].filter(Boolean).join('\n\n');
  const messages: PromptMessage[] = [{ role: 'system', content: systemContent }, ...history];
  // The card defines this field's semantics, but not a mandatory OpenAI-compatible role.
  if (postHistoryInstructions) messages.push({ role: 'system', content: postHistoryInstructions });
  return { systemPrompt, characterDefinitions, activatedCharacterBookEntries, chatHistory: history, postHistoryInstructions, messages };
}

export function resolveGreeting(character: any, selectedAlternateIndex?: number): string {
  const selected = selectedAlternateIndex === undefined ? undefined : character?.alternateGreetings?.[selectedAlternateIndex];
  const greeting = selected ?? character?.firstMes ?? character?.startPrompt ?? '';
  return applyPromptMacros(greeting, {
    char: character?.name?.trim() || 'Character',
    user: character?.playerAddressName?.trim() || 'User',
  });
}
