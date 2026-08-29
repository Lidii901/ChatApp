import type { PromptRole } from '../types';
import type { CharacterBook, CharacterBookEntry, LoreSelectiveLogic } from '../types/characterCardV2';

export type PromptMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export const GLOBAL_SYSTEM_PROMPT = `Write the next reply in a fictional roleplay chat between {{char}} and {{user}}. Use the provided description, personality, scenario and example dialogues as a base for deeply understanding and acting like the character.

Focus on emotional, logical and temporal coherence. Always stay in character, avoid repetition, develop the plot slowly, but keep the character dynamic and active instead of passive. Use impactful, concise writing. Avoid purple prose and overly flowery descriptions. Follow show-don't-tell: prioritize observable details such as body language, facial expressions, movement and tone of voice rather than explaining everything abstractly.

The character must be an active participant and take initiative in driving and moving the scene and story forward rather than repeatedly asking {{user}} for input. Introduce new characters, situations or events when they fit the existing story and make the world feel alive. Do not recap or paraphrase {{user}}'s latest turn before responding; react to the relevant details and continue the scene.

Preserve established continuity and {{user}}'s agency. Do not invent unprovided actions, thoughts, feelings, decisions, consent or bodily sensations/reactions for {{user}} as fact. Follow the formatting of recent responses and aim for roughly 2–4 paragraphs unless the scene genuinely needs otherwise.

All sexual roleplay content must involve adult fictional characters. When adult sexual content arises coherently from the established roleplay, it may be direct and explicit; do not euphemize or fade to black solely because it is sexual.`;
export const GLOBAL_POST_HISTORY = '';
export const DEFAULT_CONTEXT_SIZE_TOKENS = 32768;

export function applyPromptMacros(template: string, values: Record<string, string | undefined>): string {
  let result = (template || '').replace(/{{original}}/gi, values.original ?? '');
  const supported = ['char', 'user', 'personality', 'scenario', 'memory', 'example_dialogue', 'summary', 'profile'];
  result = supported.reduce(
    (text, macro) => text.replace(new RegExp(`{{${macro}}}`, 'gi'), values[macro] ?? ''),
    result,
  );

  // Chub character-definition macros documented in the Character Creation guide.
  result = result.replace(/{{date}}/gi, new Date().toLocaleDateString());
  result = result.replace(/{{time}}/gi, new Date().toLocaleTimeString());
  result = result.replace(/{{random:\s*\[?([^}\]]+)\]?}}/gi, (_match, body: string) => {
    const items = String(body).split(',').map(item => item.trim()).filter(Boolean);
    return items.length ? items[Math.floor(Math.random() * items.length)] : '';
  });
  result = result.replace(/{{roll:\s*\[?([^}\]]+)\]?}}/gi, (_match, body: string) => {
    const expression = String(body).trim();
    const dice = expression.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (dice) {
      const count = Math.max(1, Number(dice[1] || 1));
      const sides = Math.max(1, Number(dice[2]));
      const modifier = Number(dice[3] || 0);
      let total = modifier;
      for (let i = 0; i < count; i += 1) total += 1 + Math.floor(Math.random() * sides);
      return String(total);
    }
    const sides = Number(expression);
    return Number.isFinite(sides) && sides > 0 ? String(1 + Math.floor(Math.random() * sides)) : '';
  });
  return result;
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
  return Math.ceil(String(text || '').length / 4);
}

function extensionValue(entry: CharacterBookEntry, ...keys: string[]): unknown {
  const extensions = entry.extensions || {};
  for (const key of keys) {
    const direct = (entry as any)[key];
    if (direct !== undefined) return direct;
    const extended = (extensions as any)[key];
    if (extended !== undefined) return extended;
  }
  return undefined;
}

function normalizeSelectiveLogic(value: unknown): 'and_any' | 'and_all' | 'not_any' | 'not_all' {
  if (value === 3) return 'and_all';
  if (value === 1) return 'not_all';
  if (value === 2) return 'not_any';
  if (value === 0 || value === undefined || value === null) return 'and_any';
  const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'and_all') return 'and_all';
  if (normalized === 'not_all') return 'not_all';
  if (normalized === 'not' || normalized === 'not_any') return 'not_any';
  if (normalized === 'or' || normalized === 'and' || normalized === 'and_any') return 'and_any';
  return 'and_any';
}

function entryMatches(entry: CharacterBookEntry, text: string): boolean {
  const sensitive = entry.case_sensitive === true;
  const primaryMatches = (entry.keys || []).map(key => matchesWholeWord(text, String(key), sensitive));
  const secondaryMatches = (entry.secondary_keys || []).map(key => matchesWholeWord(text, String(key), sensitive));
  const primary = primaryMatches.some(Boolean);
  if (entry.constant === true) return true;
  if (!primary) return false;
  if (!entry.selective || secondaryMatches.length === 0) return true;

  const logic = normalizeSelectiveLogic(extensionValue(entry, 'selectiveLogic', 'selective_logic') as LoreSelectiveLogic);
  const anySecondary = secondaryMatches.some(Boolean);
  const allSecondary = secondaryMatches.every(Boolean);
  if (logic === 'and_all') return allSecondary;
  if (logic === 'not_all') return !allSecondary;
  if (logic === 'not_any') return !anySecondary;
  return anySecondary;
}

function passesProbability(entry: CharacterBookEntry, random: () => number): boolean {
  const useProbability = extensionValue(entry, 'useProbability', 'use_probability');
  if (useProbability === false) return true;
  const raw = extensionValue(entry, 'probability');
  if (raw === undefined || raw === null || raw === '') return true;
  const probability = Math.max(0, Math.min(100, Number(raw)));
  if (!Number.isFinite(probability)) return true;
  return random() * 100 < probability;
}

export function activateCharacterBook(
  book: CharacterBook | undefined,
  history: PromptMessage[],
  options: { scanDepthOverride?: number; tokenBudgetOverride?: number; random?: () => number } = {},
): ActivatedLoreEntry[] {
  if (!book?.entries?.length) return [];
  const depthCandidate = options.scanDepthOverride ?? book.scan_depth;
  const depth = Number.isInteger(depthCandidate) && Number(depthCandidate) >= 0 ? Number(depthCandidate) : 4;
  const scanText = depth === 0 ? '' : history.slice(-depth).map(message => message.content).join('\n');
  const active: ActivatedLoreEntry[] = [];
  const activatedIndexes = new Set<number>();
  const probabilityResolvedIndexes = new Set<number>();
  const probabilityPassedIndexes = new Set<number>();
  const random = options.random || Math.random;
  let recursiveText = scanText;

  do {
    const newlyActivated: Array<{ entry: CharacterBookEntry; index: number }> = [];
    book.entries.forEach((entry, index) => {
      if (activatedIndexes.has(index) || !entry?.content?.trim() || entry.enabled === false) return;
      if (!entryMatches(entry, recursiveText)) return;
      if (!probabilityResolvedIndexes.has(index)) {
        probabilityResolvedIndexes.add(index);
        if (passesProbability(entry, random)) probabilityPassedIndexes.add(index);
      }
      if (!probabilityPassedIndexes.has(index)) return;
      newlyActivated.push({ entry, index });
    });
    newlyActivated.forEach(({ entry, index }) => {
      activatedIndexes.add(index);
      active.push({ ...entry, insertion_order: entry.insertion_order ?? index, priority: entry.priority ?? 0 });
      recursiveText += `\n${entry.content}`;
    });
    if (!book.recursive_scanning || newlyActivated.length === 0) break;
  } while (activatedIndexes.size < book.entries.length);

  const budgetCandidate = options.tokenBudgetOverride ?? book.token_budget;
  if (typeof budgetCandidate === 'number' && Number.isFinite(budgetCandidate) && budgetCandidate >= 0) {
    while (active.reduce((sum, entry) => sum + approximateTokens(entry.content), 0) > budgetCandidate && active.length) {
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
  const personality = String(character?.personality || '');
  const scenario = cardValue(character, 'scenario', 'startPlot');
  const summary = String(storyContext?.sceneSummary || '');
  const profile = String(storyContext?.profile || '');
  const base = { char, user, personality, scenario, memory: memoryText, summary, profile };
  const example = applyPromptMacros(cardValue(character, 'mesExample', 'exampleDialogues'), base);
  return { ...base, example_dialogue: example };
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
  storyContext?: any,
  memoryText = '',
): string {
  const values = macroValues(character, storyContext, memoryText);
  const includePersonality = options.includePersonality !== false;
  const includeScenario = options.includeScenario !== false;
  const includeExample = options.includeExample !== false;
  return [
    applyPromptMacros(cardValue(character, 'description', 'appearance'), values),
    includePersonality ? applyPromptMacros(values.personality, values) : '',
    includeScenario ? applyPromptMacros(values.scenario, values) : '',
    includeExample ? values.example_dialogue : '',
  ].filter(value => value && value.trim()).join('\n\n');
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

function estimateRawMessageTokens(message: any): number {
  const imageText = message?.image?.url ? String(message?.image?.caption || 'attached image') : '';
  return approximateTokens(`${String(message?.content ?? '')}\n${imageText}`) + 4;
}

export function packRawHistoryToTokenBudget(messages: any[], tokenBudget: number): { kept: any[]; dropped: any[] } {
  if (!messages.length) return { kept: [], dropped: [] };
  const budget = Math.max(0, Math.floor(tokenBudget));
  const keptReversed: any[] = [];
  let used = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const cost = estimateRawMessageTokens(message);
    if (keptReversed.length > 0 && used + cost > budget) break;
    keptReversed.push(message);
    used += cost;
  }

  const kept = keptReversed.reverse();
  return { kept, dropped: messages.slice(0, messages.length - kept.length) };
}

function normalizeRole(value: unknown, fallback: PromptRole = 'system'): PromptRole {
  return value === 'user' || value === 'assistant' || value === 'system' ? value : fallback;
}

function depthPrompt(character: any): { prompt: string; depth: number; role: PromptRole } | null {
  const extension = character?.extensions?.depth_prompt;
  const prompt = character?.characterNote !== undefined ? character.characterNote : extension?.prompt;
  if (!String(prompt || '').trim()) return null;
  const rawDepth = character?.characterNoteDepth !== undefined ? character.characterNoteDepth : extension?.depth;
  const depth = Number.isFinite(Number(rawDepth)) ? Math.max(0, Math.floor(Number(rawDepth))) : 4;
  const role = normalizeRole(character?.characterNoteRole !== undefined ? character.characterNoteRole : extension?.role, 'system');
  return { prompt: String(prompt), depth, role };
}

function insertAtDepth(history: PromptMessage[], message: PromptMessage, depth: number): PromptMessage[] {
  const copy = [...history];
  const index = Math.max(0, copy.length - Math.max(0, depth));
  copy.splice(index, 0, message);
  return copy;
}

export interface ChubPromptConfig {
  contextSizeTokens?: number;
  maxOutputTokens?: number;
  promptNote?: string;
  promptNoteDepth?: number;
  promptNoteRole?: PromptRole;
  assistantPrefill?: string;
  loreScanDepthOverride?: number;
  loreTokenBudgetOverride?: number;
}

export function buildChatPayload(input: {
  character: any;
  messages: any[];
  storyContext?: any;
  language?: 'de' | 'en';
  /** @deprecated legacy fixed-message setting, ignored when contextSizeTokens is provided. */
  contextWindowSize?: number;
  promptConfig?: ChubPromptConfig;
}) {
  const { character, language = 'de', storyContext } = input;
  const promptConfig = input.promptConfig || {};
  const playerAddress = character?.playerAddressName?.trim() || 'User';
  const fullHistory = formatHistory(input.messages || [], language, playerAddress);
  const loreScanHistory = fullHistory.filter(message => message.role !== 'system');
  const loreScanDepthOverride = promptConfig.loreScanDepthOverride ?? character?.loreScanDepthOverride;
  const loreTokenBudgetOverride = promptConfig.loreTokenBudgetOverride ?? character?.loreTokenBudgetOverride;
  const activatedRawEntries = activateCharacterBook(character?.characterBook, loreScanHistory, {
    scanDepthOverride: loreScanDepthOverride,
    tokenBudgetOverride: loreTokenBudgetOverride,
  });

  const preliminaryLoreText = activatedRawEntries.map(entry => entry.content.trim()).filter(Boolean).join('\n\n');
  const values = macroValues(character, storyContext, preliminaryLoreText);
  const activatedCharacterBookEntries = activatedRawEntries.map(entry => ({
    ...entry,
    content: applyPromptMacros(entry.content, values),
  }));
  const activeLoreText = activatedCharacterBookEntries.map(entry => entry.content.trim()).filter(Boolean).join('\n\n');

  const systemPrompt = resolveSystemPrompt(character, language, storyContext, activeLoreText);
  const postHistoryInstructions = resolvePostHistory(character, storyContext, activeLoreText);
  const characterDefinitions = buildCharacterDefinitions(character, {
    includePersonality: !containsMacro(character, 'personality'),
    includeScenario: !containsMacro(character, 'scenario'),
    includeExample: !containsMacro(character, 'example_dialogue'),
  }, storyContext, activeLoreText);

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

  const resolvedDepthPrompt = depthPrompt(character);
  const characterNoteContent = resolvedDepthPrompt
    ? applyPromptMacros(resolvedDepthPrompt.prompt, macroValues(character, storyContext, activeLoreText))
    : '';
  const promptNoteContent = String(promptConfig.promptNote || '').trim()
    ? applyPromptMacros(String(promptConfig.promptNote), macroValues(character, storyContext, activeLoreText))
    : '';
  const assistantPrefill = String(promptConfig.assistantPrefill || '').trim()
    ? applyPromptMacros(String(promptConfig.assistantPrefill), macroValues(character, storyContext, activeLoreText))
    : '';

  const contextSizeTokens = Math.max(2048, Math.floor(promptConfig.contextSizeTokens || DEFAULT_CONTEXT_SIZE_TOKENS));
  const outputReserve = Math.max(128, Math.floor(promptConfig.maxOutputTokens || 1200));
  const fixedTokens = approximateTokens([
    systemContent,
    postHistoryInstructions,
    characterNoteContent,
    promptNoteContent,
    assistantPrefill,
  ].filter(Boolean).join('\n\n')) + 256;
  const historyTokenBudget = Math.max(256, contextSizeTokens - outputReserve - fixedTokens);
  const packed = packRawHistoryToTokenBudget(input.messages || [], historyTokenBudget);
  let history = formatHistory(packed.kept, language, playerAddress);

  if (resolvedDepthPrompt && characterNoteContent.trim()) {
    history = insertAtDepth(history, {
      role: resolvedDepthPrompt.role,
      content: characterNoteContent.trim(),
    }, resolvedDepthPrompt.depth);
  }

  if (promptNoteContent.trim()) {
    history = insertAtDepth(history, {
      role: normalizeRole(promptConfig.promptNoteRole, 'system'),
      content: promptNoteContent.trim(),
    }, Math.max(0, Math.floor(promptConfig.promptNoteDepth ?? 1)));
  }

  const messages: PromptMessage[] = [{ role: 'system', content: systemContent }, ...history];

  if (postHistoryInstructions) {
    messages.push({ role: 'system', content: `${postHistoryInstructions}\n\n${languageGuard}` });
  }

  if (assistantPrefill) {
    messages.push({ role: 'assistant', content: assistantPrefill });
  }

  return {
    systemPrompt,
    characterDefinitions,
    activatedCharacterBookEntries,
    chatHistory: history,
    rawHistoryKept: packed.kept,
    rawHistoryDropped: packed.dropped,
    chatMemory,
    characterNote: characterNoteContent,
    promptNote: promptNoteContent,
    assistantPrefill,
    postHistoryInstructions,
    historyTokenBudget,
    contextSizeTokens,
    estimatedPromptTokens: messages.reduce((sum, message) => sum + approximateTokens(message.content) + 4, 0),
    messages,
  };
}

export function buildStartChatPayload(input: {
  character: any;
  language?: 'de' | 'en';
  storyContext?: any;
  scenarioOverride?: string;
  promptConfig?: ChubPromptConfig;
}) {
  const language = input.language || 'de';
  const character = input.scenarioOverride !== undefined
    ? { ...input.character, scenario: input.scenarioOverride }
    : input.character;
  const payload = buildChatPayload({
    character,
    messages: [],
    storyContext: input.storyContext,
    language,
    promptConfig: input.promptConfig,
  });
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
