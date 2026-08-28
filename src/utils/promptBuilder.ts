import type { CharacterBook, CharacterBookEntry } from '../types/characterCardV2';

export type PromptMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const GLOBAL_SYSTEM_PROMPT = "Write {{char}}'s next reply in an immersive roleplay between {{char}} and {{user}}.";
export const GLOBAL_POST_HISTORY = '';

export function applyPromptMacros(template: string, values: Record<string, string | undefined>): string {
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
  const value = character?.[authoritative] !== undefined
    ? character[authoritative]
    : character?.[legacy];
  return String(value ?? '').trim();
}

function macroValues(character: any, storyContext: any = {}, memoryText = '') {
  const char = character?.name?.trim() || 'Character';
  const user = character?.playerAddressName?.trim() || 'User';
  const example = applyPromptMacros(cardValue(character, 'mesExample', 'exampleDialogues'), { char, user });
  return {
    char,
    user,
    personality: String(character?.personality || ''),
    scenario: cardValue(character, 'scenario', 'startPlot'),
    example_dialogue: example,
    memory: memoryText,
    summary: String(storyContext?.sceneSummary || ''),
    profile: String(storyContext?.profile || ''),
  };
}

function outputLanguageInstruction(char: string, language: 'de' | 'en'): string {
  return language === 'en'
    ? `Generate ${char}'s next reply in English.`
    : `Generate ${char}'s next reply in German.`;
}

function finalLanguageGuard(language: 'de' | 'en'): string {
  return language === 'en'
    ? 'FINAL OUTPUT LANGUAGE: Write the entire next reply in English only. Do not switch to another language because earlier character definitions or examples use it.'
    : 'FINALE AUSGABESPRACHE: Schreibe die gesamte nächste Antwort ausschliesslich auf Deutsch. Wechsle nicht wegen anderssprachiger Charakterdefinitionen oder Beispiele in eine andere Sprache.';
}

export function resolveSystemPrompt(
  character: any,
  language: 'de' | 'en',
  storyContext?: any,
  memoryText = '',
): string {
  const values = macroValues(character, storyContext, memoryText);
  const raw = character?.systemPrompt?.trim() || GLOBAL_SYSTEM_PROMPT;
  const resolved = applyPromptMacros(raw, { ...values, original: GLOBAL_SYSTEM_PROMPT });
  return `${resolved.trim()}\n${outputLanguageInstruction(values.char, language)}`;
}

export function resolvePostHistory(character: any, storyContext?: any, memoryText = ''): string {
  return applyPromptMacros(character?.postHistoryInstructions?.trim() || GLOBAL_POST_HISTORY, {
    ...macroValues(character, storyContext, memoryText),
    original: GLOBAL_POST_HISTORY,
  }).trim();
}

function containsMacro(character: any, macro: string): boolean {
  const source = `${character?.systemPrompt || ''}\n${character?.postHistoryInstructions || ''}`;
  return new RegExp(`{{${macro}}}`, 'i').test(source);
}

export function buildCharacterDefinitions(
  character: any,
  options: { includePersonality?: boolean; includeScenario?: boolean; includeExample?: boolean } = {},
): string {
  const values = macroValues(character);
  const includePersonality = options.includePersonality !== false;
  const includeScenario = options.includeScenario !== false;
  const includeExample = options.includeExample !== false;
  return [
    cardValue(character, 'description', 'appearance'),
    includePersonality ? values.personality : '',
    includeScenario ? values.scenario : '',
    includeExample ? values.example_dialogue : '',
  ].filter(Boolean).join('\n\n');
}

function buildChatMemory(storyContext: any): string {
  const summary = String(storyContext?.sceneSummary || '').trim();
  if (!summary) return '';
  return `Chat Memory:\n${summary}`;
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
  character: any;
  messages: any[];
  storyContext?: any;
  language?: 'de' | 'en';
  contextWindowSize?: number;
}) {
  const { character, language = 'de', storyContext } = input;
  const playerAddress = character?.playerAddressName?.trim() || 'User';
  const fullHistory = formatHistory(input.messages || [], language, playerAddress);
  const loreScanHistory = fullHistory.filter(message => message.role !== 'system');
  const activatedCharacterBookEntries = activateCharacterBook(character?.characterBook, loreScanHistory);
  const activeLoreText = activatedCharacterBookEntries.map(entry => entry.content.trim()).filter(Boolean).join('\n\n');

  const contextWindowSize = input.contextWindowSize || 12;
  const history = formatHistory((input.messages || []).slice(-contextWindowSize), language, playerAddress);

  const systemPrompt = resolveSystemPrompt(character, language, storyContext, activeLoreText);
  const postHistoryInstructions = resolvePostHistory(character, storyContext, activeLoreText);
  const characterDefinitions = buildCharacterDefinitions(character, {
    includePersonality: !containsMacro(character, 'personality'),
    includeScenario: !containsMacro(character, 'scenario'),
    includeExample: !containsMacro(character, 'example_dialogue'),
  });

  const includeAutomaticLore = !containsMacro(character, 'memory');
  const beforeLore = includeAutomaticLore
    ? activatedCharacterBookEntries.filter(entry => entry.position === 'before_char').map(entry => entry.content.trim()).join('\n\n')
    : '';
  const afterLore = includeAutomaticLore
    ? activatedCharacterBookEntries.filter(entry => entry.position !== 'before_char').map(entry => entry.content.trim()).join('\n\n')
    : '';

  const chatMemory = containsMacro(character, 'summary') ? '' : buildChatMemory(storyContext);
  const languageGuard = finalLanguageGuard(language);
  const systemContent = [systemPrompt, beforeLore, characterDefinitions, afterLore, chatMemory, languageGuard].filter(Boolean).join('\n\n');
  const messages: PromptMessage[] = [{ role: 'system', content: systemContent }, ...history];

  if (postHistoryInstructions) {
    messages.push({ role: 'system', content: `${postHistoryInstructions}\n\n${languageGuard}` });
  }

  return {
    systemPrompt,
    characterDefinitions,
    activatedCharacterBookEntries,
    chatHistory: history,
    chatMemory,
    postHistoryInstructions,
    messages,
  };
}

export function buildStartChatPayload(input: {
  character: any;
  language?: 'de' | 'en';
  storyContext?: any;
  scenarioOverride?: string;
}) {
  const language = input.language || 'de';
  const character = input.scenarioOverride !== undefined
    ? { ...input.character, scenario: input.scenarioOverride }
    : input.character;
  const payload = buildChatPayload({ character, messages: [], storyContext: input.storyContext, language });
  const scenario = cardValue(character, 'scenario', 'startPlot');
  const values = macroValues(character, input.storyContext);
  const openingTemplate = language === 'de'
    ? 'Beginne die erste Nachricht als {{char}} basierend auf dem Szenario:\n\n{{scenario}}'
    : 'Write the opening message as {{char}} based on the scenario:\n\n{{scenario}}';
  return {
    ...payload,
    openingMessage: { role: 'user' as const, content: applyPromptMacros(openingTemplate, { ...values, scenario }) },
  };
}

export function resolveGreeting(character: any, selectedAlternateIndex?: number): string {
  const selected = selectedAlternateIndex === undefined ? undefined : character?.alternateGreetings?.[selectedAlternateIndex];
  const greeting = selected !== undefined
    ? selected
    : character?.firstMes !== undefined
      ? character.firstMes
      : character?.startPrompt ?? '';
  return applyPromptMacros(greeting, {
    char: character?.name?.trim() || 'Character',
    user: character?.playerAddressName?.trim() || 'User',
  });
}
