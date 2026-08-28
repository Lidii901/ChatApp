import type { CharacterBook, CharacterBookEntry } from '../types/characterCardV2';

export type PromptMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const GLOBAL_SYSTEM_PROMPT = "Write {{char}}'s next reply in an immersive roleplay between {{char}} and {{user}}.";
export const GLOBAL_POST_HISTORY = '';

export function applyPromptMacros(template: string, values: Record<string, string | undefined>): string {
  const supported = ['char', 'user', 'personality', 'scenario', 'memory', 'example_dialogue', 'summary', 'profile', 'original'];
  return supported.reduce(
    (text, macro) => text.replace(new RegExp(`{{${macro}}}`, 'gi'), values[macro] ?? ''),
    template || '',
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

/** Character-book budgeting uses a documented approximation, not model-specific tokenization. */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function activateCharacterBook(book: CharacterBook | undefined, history: PromptMessage[]): ActivatedLoreEntry[] {
  if (!book?.entries?.length) return [];
  const depth = Number.isInteger(book.scan_depth) && (book.scan_depth as number) >= 0 ? book.scan_depth as number : 4;
  const scanText = history.slice(-depth).map(message => message.content).join('\n');
  let active = book.entries.flatMap((entry, index) => {
    if (!entry?.content?.trim() || entry.enabled === false) return [];
    const sensitive = entry.case_sensitive === true;
    const primary = (entry.keys || []).some(key => matchesWholeWord(scanText, String(key), sensitive));
    const secondary = (entry.secondary_keys || []).some(key => matchesWholeWord(scanText, String(key), sensitive));
    if (entry.constant !== true && !(primary && (!entry.selective || secondary))) return [];
    return [{ ...entry, insertion_order: entry.insertion_order ?? index, priority: entry.priority ?? 0 }];
  });

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

export function resolveSystemPrompt(character: any, language: 'de' | 'en'): string {
  const char = character?.name?.trim() || 'Character';
  const user = character?.playerAddressName?.trim() || 'User';
  const raw = character?.systemPrompt?.trim() || GLOBAL_SYSTEM_PROMPT;
  const resolved = applyPromptMacros(raw, {
    char, user, original: GLOBAL_SYSTEM_PROMPT, personality: character?.personality,
    scenario: cardValue(character, 'scenario', 'startPlot'),
  });
  const languageInstruction = language === 'en'
    ? `Generate ${char}'s next reply in English.`
    : `Generate ${char}'s next reply in German.`;
  return `${resolved.trim()}\n${languageInstruction}`;
}

export function resolvePostHistory(character: any): string {
  return applyPromptMacros(character?.postHistoryInstructions?.trim() || GLOBAL_POST_HISTORY, {
    char: character?.name?.trim() || 'Character',
    user: character?.playerAddressName?.trim() || 'User',
    original: GLOBAL_POST_HISTORY,
    personality: character?.personality,
    scenario: cardValue(character, 'scenario', 'startPlot'),
  }).trim();
}

export function buildCharacterDefinitions(character: any, activated: ActivatedLoreEntry[]): string {
  const char = character?.name?.trim() || 'Character';
  const user = character?.playerAddressName?.trim() || 'User';
  const fields = [
    cardValue(character, 'description', 'appearance'),
    String(character?.personality || '').trim(),
    cardValue(character, 'scenario', 'startPlot'),
    ...activated.map(entry => entry.content.trim()),
    applyPromptMacros(cardValue(character, 'mesExample', 'exampleDialogues'), { char, user }),
  ];
  return fields.filter(Boolean).join('\n\n');
}

export function buildChatPayload(input: {
  character: any; messages: any[]; language?: 'de' | 'en'; contextWindowSize?: number;
}) {
  const { character, language = 'de' } = input;
  const history: PromptMessage[] = (input.messages || []).slice(-(input.contextWindowSize || 12)).map(message => ({
    role: message.role === 'lidii' || message.role === 'user' ? 'user' : message.role === 'system' ? 'system' : 'assistant',
    content: String(message.content ?? ''),
  }));
  const activatedCharacterBookEntries = activateCharacterBook(character?.characterBook, history);
  const systemPrompt = resolveSystemPrompt(character, language);
  const characterDefinitions = buildCharacterDefinitions(character, activatedCharacterBookEntries);
  const postHistoryInstructions = resolvePostHistory(character);
  const systemContent = [systemPrompt, characterDefinitions].filter(Boolean).join('\n\n');
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
