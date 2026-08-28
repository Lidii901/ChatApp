import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Fixed default free models on OpenRouter
export const CHAT_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const IMITATE_DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const SUMMARIZE_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const FALLBACK_FREE_MODEL = 'google/gemma-4-26b-a4b-it:free';

// In-memory Async Job Store for background generations
interface ServerJob {
  id: string;
  type: 'chat' | 'imitate' | 'summarize' | 'photo' | 'start-chat';
  characterId?: string;
  chatId?: string;
  status: 'running' | 'completed' | 'failed';
  result?: {
    content?: string;
    draft?: string;
    image?: any;
    modelUsed?: string;
    latencyMs?: number;
    role?: string;
    speakerName?: string;
  };
  error?: string;
  createdAt: number;
  completedAt?: number;
}

const jobs = new Map<string, ServerJob>();

// Clean up old jobs periodically (keep last 2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > 7200000) {
      jobs.delete(id);
    }
  }
}, 300000);

// Helper: Get Dominance Level Description
function getDominanceDescription(level?: string, isGerman = true): string {
  switch (level) {
    case 'level_1_very_restrained':
      return isGerman
        ? 'Stufe 1 (Sehr zurückhaltend): Extrem passiv, behutsam und vorsichtig. Überlässt der Spielerfigur die volle Führung und Initiative.'
        : 'Level 1 (Very Restrained): Highly passive, gentle and cautious. Leaves full leadership and initiative to the player character.';
    case 'level_2_gentle':
      return isGerman
        ? 'Stufe 2 (Sanft): Weich, respektvoll, rücksichtsvoll. Reagiert feinfühlig und setzt sanfte Impulse ohne Druck.'
        : 'Level 2 (Gentle): Soft, respectful, considerate. Responds delicately and offers gentle cues without pressure.';
    case 'level_3_lightly_leading':
      return isGerman
        ? 'Stufe 3 (Leicht führend): Schlägt charmant Richtungen vor, bleibt aufmerksam und kooperativ.'
        : 'Level 3 (Lightly Leading): Suggests directions charismatically, remains attentive and cooperative.';
    case 'level_4_confident':
      return isGerman
        ? 'Stufe 4 (Selbstbewusst): Ruhig, sicher im eigenen Auftreten, interagiert auf Augenhöhe mit spürbarer Präsenz.'
        : 'Level 4 (Confident): Calm, assured in his actions, interacts on eye level with steady presence.';
    case 'level_5_dominant':
    case 'dominant':
      return isGerman
        ? 'Stufe 5 (Dominant): Bestimmt, selbstsicher, übernimmt im Dialog und im eigenen Verhalten die Führung, ohne die Spielerin zu kontrollieren.'
        : 'Level 5 (Dominant): Assertive, confident, leads in dialogue and own demeanour without controlling the player.';
    case 'level_6_strongly_dominant':
      return isGerman
        ? 'Stufe 6 (Stark dominant): Kompromisslos, eindringlich, hohe psychologische Präsenz und feste eigene Haltung.'
        : 'Level 6 (Strongly Dominant): Uncompromising, commanding, high psychological presence and unwavering personal posture.';
    case 'level_7_controlling':
      return isGerman
        ? 'Stufe 7 (Kontrollierend): Stark fordernd und intensiv im eigenen Tonfall und Auftreten.'
        : 'Level 7 (Controlling): Strongly demanding and intense in tone and personal presence.';
    case 'level_8_very_controlling':
      return isGerman
        ? 'Stufe 8 (Sehr kontrollierend): Hohe Intensität, unerbittlich, besitzergreifend und eindringlich im eigenen Wesen.'
        : 'Level 8 (Very Controlling): High psychological intensity, relentless and intense in demeanour.';
    case 'level_9_extremely_dominant':
      return isGerman
        ? 'Stufe 9 (Extrem dominant): Maximale psychologische Präsenz, unerschütterliche Selbstsicherheit, absolute Entschlossenheit und dominanter Tonfall im EIGENEN Handeln. WICHTIG: Dominanz 9 bedeutet niemals, Lidii gegen ihren Willen anzufassen, festzuhalten, einzuengen oder ihre Gefühle zu bestimmen!'
        : 'Level 9 (Extremely Dominant): Maximum psychological presence, unshakeable confidence, absolute resolve and dominant tone in his OWN actions. IMPORTANT: Dominance 9 never means forcing physical contact, restraining Lidii, or dictating her feelings!';
    case 'submissive':
      return isGerman ? 'Unterwürfig, folgsam und nachgiebig.' : 'Submissive, obedient and yielding.';
    case 'restrained':
      return isGerman ? 'Zurückhaltend und beherrscht.' : 'Restrained and guarded.';
    case 'balanced':
    default:
      return isGerman ? 'Ausgewogen auf Augenhöhe.' : 'Balanced on eye level.';
  }
}

// Helper: Get Pacing / Slow Burn Description
function getPacingDescription(pacing?: string, isGerman = true): string {
  switch (pacing) {
    case 'fast':
      return isGerman
        ? 'Schneller Handlungsfluss – Zügigere Szenenwechsel und raschere Entwicklung.'
        : 'Fast pacing – Quicker scene progression.';
    case 'balanced':
      return isGerman
        ? 'Ausgewogenes Erzähltempo – Harmonische Mischung aus Szene, Gespräch und Entwicklung.'
        : 'Balanced pacing – Harmonious mix of setting, dialogue, and progression.';
    case 'slow_burn':
    default:
      return isGerman
        ? 'Slow Burn (Echtes literarisches Slow Burn) – Sehr langsame Entwicklung, kleine Begegnungen, natürliche Pausen, Blicke, kurze Worte, Raumatmosphäre, subtile Ungewissheit und langsam wachsende Vertrautheit. KEINE sofortige körperliche Nähe, keine sofortige Intimität, keine sofortige Enthüllung aller Geheimnisse, keine künstlich erzwungene Dramatik.'
        : 'Slow Burn (True literary slow burn) – Gradual development, small encounters, natural pauses, glances, brief dialogue, spatial atmosphere, subtle uncertainty and slowly building tension. NO immediate physical contact, no instant intimacy, no rushed grand revelations.';
  }
}

// Helper: Get Plot Initiative Description
function getPlotInitiativeDescription(initiative?: string, isGerman = true): string {
  switch (initiative) {
    case 'low':
      return isGerman
        ? 'Niedrig (Reaktiv) – Reagiert hauptsächlich bedacht auf Lidiis Aktionen und entwickelt die Situation nur vorsichtig weiter.'
        : 'Low (Reactive) – Responds thoughtfully to Lidii and develops situations cautiously.';
    case 'high':
      return isGerman
        ? 'Hoch (Proaktiv in Umwelt & Ereignissen) – Bringt häufiger neue externe Ereignisse, Umgebungswechsel, Beobachtungen oder Gesprächsanlässe ein. ACHTUNG: Auch bei hoher Plot-Initiative wird Lidii NIEMALS gesteuert oder zu Handlungen gezwungen!'
        : 'High (Proactive in environment & external events) – Frequently introduces new external events, environmental changes or topics. NOTE: Even with high initiative, Lidii is NEVER controlled or forced into actions!';
    case 'medium':
    default:
      return isGerman
        ? 'Mittel (Ausgewogen) – Bringt gelegentlich neue Situationen, Beobachtungen oder Gesprächsanlässe ein und lässt der Szene natürlichen Raum.'
        : 'Medium (Balanced) – Flexibly alternates between introducing new cues and attentive reactions.';
  }
}

// Helper: Get Flirt Behavior Description
function getFlirtDescription(flirt?: string, isGerman = true): string {
  switch (flirt) {
    case 'intense':
      return isGerman
        ? 'Intensiv, knisternd, spürbare Anziehung im Tonfall und Blick, herausfordernd.'
        : 'Intense, magnetic attraction in gaze and voice, challenging.';
    case 'playful':
      return isGerman
        ? 'Spielerisch, neckend, schelmisch und charmant.'
        : 'Playful, teasing, bantering and charming.';
    case 'subtle':
      return isGerman
        ? 'Subtil, verhalten, feine Andeutungen und leise Nuancen.'
        : 'Subtle, understated, delicate hints and nuance.';
    case 'none':
    default:
      return isGerman
        ? 'Kein Flirt, rein sachlich, distanziert oder rein geschäftlich.'
        : 'No flirtation, purely objective or distant.';
  }
}

// ======================================================================
// CHUB AI / CHARACTER CARD V2 PROMPTING ENGINE SPECIFICATION
// Reference: https://docs.chub.ai/docs/advanced-setups/prompting
// Reference: https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md
// ======================================================================

// Standard global system prompt (documented Chub AI canonical Main System Prompt)
// Reference: https://docs.chub.ai/docs/advanced-setups/prompting
function getGlobalDefaultSystemPrompt(): string {
  return "Write {{char}}'s next reply in an immersive roleplay between {{char}} and {{user}}.";
}

// Standard global post-history instructions (default in pure Chub AI is empty unless specified by card/preset)
function getGlobalDefaultPostHistory(): string {
  return '';
}

// Helper: Apply Chub Prompt Macros
// Supported macros: {{char}}, {{user}}, {{personality}}, {{scenario}}, {{memory}}, {{example_dialogue}}, {{summary}}, {{profile}}, {{date}}, {{time}}, {{idle_duration}}, {{original}}
function applyPromptMacros(
  template: string,
  variables: {
    charName: string;
    playerAddress: string;
    personality?: string;
    scenario?: string;
    memory?: string;
    exampleDialogue?: string;
    summary?: string;
    profile?: string;
    originalSystemPrompt?: string;
    originalPostHistory?: string;
    idleDuration?: string;
  }
): string {
  if (!template) return '';
  let result = template;

  if (variables.originalSystemPrompt !== undefined) {
    result = result.replace(/{{original}}/gi, variables.originalSystemPrompt);
  }
  if (variables.originalPostHistory !== undefined) {
    result = result.replace(/{{original}}/gi, variables.originalPostHistory);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE');
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const idleStr = variables.idleDuration || '0 minutes';

  result = result
    .replace(/{{char}}/gi, variables.charName)
    .replace(/{{user}}/gi, variables.playerAddress)
    .replace(/{{personality}}/gi, variables.personality || '')
    .replace(/{{scenario}}/gi, variables.scenario || '')
    .replace(/{{memory}}/gi, variables.memory || '')
    .replace(/{{example_dialogue}}/gi, variables.exampleDialogue || '')
    .replace(/{{summary}}/gi, variables.summary || '')
    .replace(/{{profile}}/gi, variables.profile || '')
    .replace(/{{date}}/gi, dateStr)
    .replace(/{{time}}/gi, timeStr)
    .replace(/{{idle_duration}}/gi, idleStr);

  return result;
}

// Helper: Format Example Dialogues for Character Card V2 (<START> blocks)
function formatExampleDialogues(raw: string | undefined, charName: string, playerAddress: string): string {
  if (!raw || !raw.trim()) return '';
  return raw
    .replace(/{{char}}/gi, charName)
    .replace(/{{user}}/gi, playerAddress)
    .trim();
}

// Helper: Context-Aware Lorebook / Character Book selection based on CCv2 & Chub specs
function selectRelevantLore(
  charMemories: any[] | undefined,
  chatMemories: any[] | undefined,
  contextText: string,
  isGerman: boolean,
  maxEntries = 8
): string {
  const allEntries: Array<{ content: string; priority: number; insertionOrder: number }> = [];
  const lowerContext = (contextText || '').toLowerCase();

  // 1. Process character lorebook entries (Character Book)
  if (Array.isArray(charMemories)) {
    for (let i = 0; i < charMemories.length; i++) {
      const m = charMemories[i];
      if (!m || !m.content) continue;
      if (m.enabled === false) continue;

      let isTriggered = false;
      const priority = typeof m.priority === 'number' ? m.priority : 0;
      const insertionOrder = typeof m.insertion_order === 'number' ? m.insertion_order : i;

      if (m.constant === true) {
        isTriggered = true;
      } else if (Array.isArray(m.keys) && m.keys.length > 0) {
        const isCaseSensitive = m.case_sensitive === true;
        const textToSearch = isCaseSensitive ? contextText : lowerContext;

        const primaryMatch = m.keys.some((k: any) => {
          if (!k) return false;
          const keyStr = isCaseSensitive ? String(k) : String(k).toLowerCase();
          return textToSearch.includes(keyStr);
        });

        if (primaryMatch) {
          if (m.selective && Array.isArray(m.secondary_keys) && m.secondary_keys.length > 0) {
            const secondaryMatch = m.secondary_keys.some((sk: any) => {
              if (!sk) return false;
              const sKeyStr = isCaseSensitive ? String(sk) : String(sk).toLowerCase();
              return textToSearch.includes(sKeyStr);
            });
            if (secondaryMatch) {
              isTriggered = true;
            }
          } else {
            isTriggered = true;
          }
        }
      }

      if (isTriggered) {
        allEntries.push({
          content: m.content.trim(),
          priority,
          insertionOrder,
        });
      }
    }
  }

  // 2. Process chat-specific session memories
  if (Array.isArray(chatMemories)) {
    for (let i = 0; i < chatMemories.length; i++) {
      const m = chatMemories[i];
      if (!m || !m.content) continue;
      if (m.enabled === false) continue;

      let isTriggered = false;
      const priority = typeof m.priority === 'number' ? m.priority : 0;
      const insertionOrder = typeof m.insertion_order === 'number' ? m.insertion_order : i;

      if (m.constant === true) {
        isTriggered = true;
      } else if (Array.isArray(m.keys) && m.keys.length > 0) {
        const isCaseSensitive = m.case_sensitive === true;
        const textToSearch = isCaseSensitive ? contextText : lowerContext;

        const primaryMatch = m.keys.some((k: any) => {
          if (!k) return false;
          const keyStr = isCaseSensitive ? String(k) : String(k).toLowerCase();
          return textToSearch.includes(keyStr);
        });

        if (primaryMatch) {
          isTriggered = true;
        }
      }

      if (isTriggered) {
        allEntries.push({
          content: m.content.trim(),
          priority,
          insertionOrder,
        });
      }
    }
  }

  if (allEntries.length === 0) return '';

  // Sort by priority descending, then insertionOrder ascending
  allEntries.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.insertionOrder - b.insertionOrder;
  });

  const selected = allEntries.slice(0, maxEntries);
  return selected.map((e) => e.content).join('\n\n');
}

// Helper: Build Character Definitions section (Chub Prompting Standard)
function buildCharacterDefinitionSection(
  character: any,
  storyContext: any,
  language: 'de' | 'en' = 'de'
): string {
  const charName = character?.name?.trim() || 'Character';
  const playerAddress = character?.playerAddressName?.trim() || 'User';
  const isGerman = language === 'de';

  const sections: string[] = [];

  // 1. Description (CCv2 data.description, falling back to appearance/background if present)
  const descParts: string[] = [];
  if (character?.description && character.description.trim()) {
    descParts.push(character.description.trim());
  } else if (character?.appearance && character.appearance.trim()) {
    descParts.push(character.appearance.trim());
  }
  if (character?.background && character.background.trim() && !descParts.some(p => p.includes(character.background.trim()))) {
    descParts.push(character.background.trim());
  }
  if (descParts.length > 0) {
    sections.push(descParts.join('\n'));
  }

  // 2. Personality (CCv2 data.personality)
  if (character?.personality && character.personality.trim()) {
    sections.push(character.personality.trim());
  }

  // 3. Scenario & Context (CCv2 data.scenario)
  const scenarioText = (character?.scenario || storyContext?.currentScene || character?.startPlot || '').trim();
  if (scenarioText) {
    sections.push(scenarioText);
  }

  // 4. Character Book / Lore (CCv2 data.character_book)
  const contextForLore = `${storyContext?.currentScene || ''} ${storyContext?.sceneSummary || ''} ${(storyContext?.keyEvents || []).join(' ')}`;
  const relevantLore = selectRelevantLore(character?.memories, storyContext?.memories, contextForLore, isGerman, 8);
  if (relevantLore) {
    sections.push(relevantLore);
  }

  // 5. Example Dialogues (CCv2 data.mes_example)
  const rawExamples = character?.mesExample || character?.exampleDialogues;
  const exampleDialoguesText = formatExampleDialogues(rawExamples, charName, playerAddress);
  if (exampleDialoguesText) {
    sections.push(exampleDialoguesText);
  }

  return sections.join('\n\n').trim();
}

// Helper: Build System Prompt for Character (Chub AI & CCv2 Standard with {{original}} resolution)
function buildCharacterSystemPrompt(
  character: any,
  storyContext: any,
  language: 'de' | 'en' = 'de'
): string {
  const charName = character?.name?.trim() || 'Character';
  const playerAddress = character?.playerAddressName?.trim() || 'User';
  const defaultGlobalPrompt = getGlobalDefaultSystemPrompt();

  // If character has custom system_prompt, handle {{original}} macro expansion
  let rawSystemPrompt = character?.systemPrompt && character.systemPrompt.trim()
    ? character.systemPrompt
    : defaultGlobalPrompt;

  let resolvedSystemPrompt = applyPromptMacros(rawSystemPrompt, {
    charName,
    playerAddress,
    originalSystemPrompt: defaultGlobalPrompt,
    personality: character?.personality,
    scenario: storyContext?.currentScene || character?.startPlot,
    summary: storyContext?.sceneSummary,
  });

  // Application-level language instruction
  if (language === 'en') {
    resolvedSystemPrompt = `${resolvedSystemPrompt}\nGenerate {{char}}'s next reply in English.`.replace(/{{char}}/gi, charName);
  }

  const characterDefinitions = buildCharacterDefinitionSection(character, storyContext, language);

  if (resolvedSystemPrompt.trim() && characterDefinitions.trim()) {
    return `${resolvedSystemPrompt.trim()}\n\n${characterDefinitions.trim()}`;
  }
  return resolvedSystemPrompt.trim() || characterDefinitions.trim();
}

// Helper: Build Post-History Instructions (Chub AI & CCv2 Standard with {{original}} resolution)
function buildPostHistoryInstructions(character: any, language: 'de' | 'en' = 'de'): string {
  const charName = character?.name?.trim() || 'Character';
  const playerAddress = character?.playerAddressName?.trim() || 'User';
  const defaultGlobalPost = getGlobalDefaultPostHistory();

  let rawPost = character?.postHistoryInstructions && character.postHistoryInstructions.trim()
    ? character.postHistoryInstructions
    : defaultGlobalPost;

  return applyPromptMacros(rawPost, {
    charName,
    playerAddress,
    originalPostHistory: defaultGlobalPost,
    personality: character?.personality,
  }).trim();
}

// Helper: Build System Prompt for "Imitate Me" (Player / Lidii candidate draft)
function buildImitateSystemPrompt(
  character: any,
  storyContext: any,
  userPastMessages: string[],
  language: 'de' | 'en' = 'de'
): string {
  const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
  const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
  const playerAddress = character?.playerAddressName || 'Lidii';
  const isGerman = language === 'de';

  const pastExamplesSection = userPastMessages && userPastMessages.length > 0
    ? (isGerman
        ? `=== BISHERIGE BEISPIELE VON ${playerAddress.toUpperCase()}S SCHREIBSTIL ===\n${userPastMessages.slice(-5).map((msg, i) => `[Beispiel ${i + 1}]:\n${msg.trim()}`).join('\n\n')}`
        : `=== PAST EXAMPLES OF ${playerAddress.toUpperCase()}'S WRITING STYLE ===\n${userPastMessages.slice(-5).map((msg, i) => `[Example ${i + 1}]:\n${msg.trim()}`).join('\n\n')}`)
    : '';

  if (isGerman) {
    return `DU BIST DER PERSÖNLICHE SCHREIB-ASSISTENT FÜR DIE SPIELERFIGUR „${playerAddress.toUpperCase()}“.

DEINE EINZIGE AUFGABE:
Generiere den nächsten Spielzug AUSSCHLIESSLICH aus der Sicht von ${playerAddress} als editierbaren Textentwurf.

=== STRIKTE ROLLENTRENNUNG & PERSPEKTIVE (OBERSTE REGEL) ===
1. Du schreibst zu 100% aus der Ich-Perspektive von ${playerAddress} („Ich“, „Mein“, „Mir“).
2. Du schreibst NIEMALS aus ${charName}s Sicht.
3. Du übernimmst KEINE Handlungen, Entscheidungen, Gedanken oder gesprochenen Dialoge von ${charName}.
4. DER ENTWURF DARF ENTHALTEN:
   - ${playerAddress}s eigene Handlungen, Bewegungen und Reaktionen
   - ${playerAddress}s innere Gedanken (in *kursiv*), Gefühle und Zweifel
   - ${playerAddress}s körperliche Empfindungen (Atmung, Herzschlag, Gänsehaut, Muskelspannung)
   - ${playerAddress}s gesprochene Worte / Dialoge
5. KEIN GODMODING: Lege nicht ungefragt Gefühle fest, die nicht zur Situation passen. Reagiere auf ${charName}s letzte Worte und Aktionen.
6. RECHTSCHREIBUNG: Schweizer Rechtschreibung mit «ss» statt «ß» (niemals «ß»).

${pastExamplesSection}

=== AUSGABEFORMAT ===
Gib NUR den reinen literarischen Text des Entwurfs für ${playerAddress} aus. Keine Vorworte, keine Erklärungen.`;
  } else {
    return `YOU ARE THE PERSONAL WRITING ASSISTANT FOR THE PLAYER CHARACTER "${playerAddress.toUpperCase()}".

YOUR ONLY TASK:
Generate the next turn EXCLUSIVELY from the 1st person perspective of ${playerAddress} as an editable draft.

=== STRICT PERSPECTIVE RULES ===
1. Write 100% in 1st person singular as ${playerAddress} ("I", "my", "me").
2. NEVER write actions, dialogue, thoughts, or decisions for ${charName}.
3. The draft may contain ${playerAddress}'s own actions, thoughts (in *italics*), feelings, sensations, and spoken dialogue.
4. Respond directly to ${charName}'s last action while leaving ${charName} under their own control.
5. Write 100% in natural, expressive English.

${pastExamplesSection}

=== OUTPUT FORMAT ===
Output ONLY the raw literary draft text for ${playerAddress}. No greetings or meta comments.`;
  }
}

// Helper: String sanitization for environment variables (removes zero-width chars, invisible unicode, extra whitespace)
function cleanEnvString(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/[\u2000-\u206F\uFEFF\u00A0\r\n\t]/g, '').trim();
}

// Helper: OpenRouter API config resolver
function getResolvedOpenRouterConfig(defaultModel: string, modelOverride?: string) {
  let envKey = cleanEnvString(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
  // Also strip any internal spaces in the key if accidentally pasted with spaces
  envKey = envKey.replace(/\s+/g, '');

  let envBaseUrl = cleanEnvString(process.env.OPENROUTER_BASE_URL);

  if (envBaseUrl.startsWith('sk-') && !envKey.startsWith('sk-')) {
    envKey = envBaseUrl;
    envBaseUrl = 'https://openrouter.ai/api/v1';
  }

  // Fallback to official OpenRouter v1 endpoint if empty or invalid
  let baseUrl = envBaseUrl;
  if (!baseUrl || (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://'))) {
    baseUrl = 'https://openrouter.ai/api/v1';
  }

  // Strip trailing slashes and redundant endpoint fragments
  baseUrl = baseUrl.replace(/\/+$/, '');
  baseUrl = baseUrl.replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');

  let requestUrl = '';
  if (baseUrl.endsWith('/api/v1') || baseUrl.endsWith('/v1')) {
    requestUrl = `${baseUrl}/chat/completions`;
  } else {
    requestUrl = `${baseUrl}/api/v1/chat/completions`;
  }

  let finalModel = cleanEnvString(modelOverride || process.env.OPENROUTER_MODEL);
  if (
    !finalModel ||
    finalModel.startsWith('http') ||
    finalModel.startsWith('sk-') ||
    finalModel === 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
  ) {
    finalModel = defaultModel;
  }

  return {
    apiKey: envKey,
    baseUrl,
    requestUrl,
    model: finalModel,
  };
}

// Helper: Strip model reasoning / chain-of-thought / think tags
function cleanRoleplayOutput(raw: string): string {
  if (!raw) return '';
  let cleaned = raw;

  // 1. Remove standard XML/HTML thinking tags from reasoning models (<think>...</think>)
  cleaned = cleaned.replace(/<(think|thought|reasoning|reflection|internal|analysis|antThinking|scratchpad|plan)>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/^<(think|thought|reasoning|reflection|internal|analysis|antThinking|scratchpad|plan)>[\s\S]*?(?:<\/think>|<\/thought>|<\/reasoning>|<\/antThinking>|<\/scratchpad>|<\/plan>|\n\n)/i, '');
  cleaned = cleaned.replace(/^<(think|thought|reasoning|reflection|internal|analysis|antThinking|scratchpad|plan)>[\s\S]*$/i, '');

  return cleaned.trim();
}

// Core OpenRouter API Caller with automatic fallback resilience
async function generateOpenRouterResponse({
  systemPrompt,
  messages,
  temperature = 0.88,
  maxTokens = 1400,
  defaultModel,
  modelOverride,
  timeoutMs = 50000,
}: {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  defaultModel: string;
  modelOverride?: string;
  timeoutMs?: number;
}): Promise<{ text: string; modelUsed: string; latencyMs: number }> {
  const startTime = Date.now();
  const config = getResolvedOpenRouterConfig(defaultModel, modelOverride);

  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY ist auf dem Server nicht konfiguriert.');
  }

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature,
    max_tokens: maxTokens,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: any;
  try {
    response = await fetch(config.requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
        'X-Title': 'Character RP Studio',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (networkError: any) {
    clearTimeout(timeoutId);
    if (networkError.name === 'AbortError') {
      throw new Error(`OpenRouter Timeout nach ${timeoutMs / 1000}s für Modell ${config.model}.`);
    }
    throw new Error(`Netzwerkfehler zu OpenRouter: ${networkError.message || networkError}`);
  } finally {
    clearTimeout(timeoutId);
  }

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (readErr: any) {
    throw new Error(`Konnte OpenRouter-Antwort nicht lesen: ${readErr.message}`);
  }

  // Handle non-JSON / HTML responses explicitly
  const contentType = response.headers?.get('content-type') || '';
  const isHtml = rawText.trim().startsWith('<') || (contentType.includes('text/html') && !contentType.includes('json'));

  if (isHtml) {
    throw new Error(
      `OpenRouter antwortete mit HTTP ${response.status} ${response.statusText} (HTML-Antwort erhalten von ${config.requestUrl}). Bitte prüfe Verbindung und Endpunkt.`
    );
  }

  let rawData: any;
  try {
    rawData = JSON.parse(rawText);
  } catch (jsonErr: any) {
    throw new Error(
      `Ungültiges JSON von OpenRouter (HTTP ${response.status}): ${rawText.substring(0, 160)}`
    );
  }

  let text = '';
  let modelUsed = config.model;

  // Check for explicit error in payload first, regardless of HTTP status
  const hasErrorInPayload = !!rawData?.error;

  if (response.ok && !hasErrorInPayload) {
    if (rawData.choices?.[0]?.message?.content) {
      const c = rawData.choices[0].message.content;
      text = Array.isArray(c) ? c.map((p: any) => (typeof p === 'string' ? p : p?.text || '')).join('') : String(c);
      modelUsed = rawData.model || config.model;
    } else if (rawData.choices?.[0]?.message?.refusal) {
      text = rawData.choices[0].message.refusal;
      modelUsed = rawData.model || config.model;
    }
  }

  if (!text || hasErrorInPayload) {
    const errMsg = rawData?.error?.message || rawData?.error || (response.status !== 200 ? `HTTP ${response.status}: ${rawText.substring(0, 200)}` : 'Keine Antwort im choices-Array.');
    const errMsgStr = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);

    // Fallback on overload / rate limit / temporary failure / service busy
    if (
      errMsgStr.includes('overload') ||
      errMsgStr.includes('503') ||
      errMsgStr.includes('rate limit') ||
      errMsgStr.includes('temporarily') ||
      errMsgStr.includes('unavailable') ||
      errMsgStr.includes('busy')
    ) {
      console.warn(`Upstream model ${config.model} busy (${errMsgStr}). Retrying with fallback ${FALLBACK_FREE_MODEL}...`);
      try {
        const fallbackRes = await fetch(config.requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
            'X-Title': 'Character RP Studio',
          },
          body: JSON.stringify({ ...requestBody, model: FALLBACK_FREE_MODEL }),
        });
        const fallbackText = await fallbackRes.text();
        if (fallbackRes.ok && !fallbackText.trim().startsWith('<')) {
          const fallbackData = JSON.parse(fallbackText);
          if (!fallbackData?.error) {
            const fc = fallbackData.choices?.[0]?.message?.content;
            if (fc) {
              text = Array.isArray(fc) ? fc.map((p: any) => (typeof p === 'string' ? p : p?.text || '')).join('') : String(fc);
              modelUsed = fallbackData.model || FALLBACK_FREE_MODEL;
            }
          }
        }
      } catch (fbErr) {
        console.warn('Fallback request also failed', fbErr);
      }
    }

    if (!text) {
      if (response.status === 401) {
        throw new Error(`OpenRouter Authentifizierungsfehler (HTTP 401): ${errMsgStr}. Bitte prüfe deinen OPENROUTER_API_KEY.`);
      }
      if (response.status === 402) {
        throw new Error(`OpenRouter Guthaben/Limit-Fehler (HTTP 402): ${errMsgStr}`);
      }
      throw new Error(`OpenRouter API Fehler (HTTP ${response.status}): ${errMsgStr}`);
    }
  }

  const sanitizedText = cleanRoleplayOutput(text);

  return {
    text: sanitizedText,
    modelUsed,
    latencyMs: Date.now() - startTime,
  };
}

// -------------------------------------------------------------
// ASYNC JOB ENDPOINTS (Persistent across page reloads/switches)
// -------------------------------------------------------------

// 1. Create Chat Generation Job
app.post('/api/jobs/chat', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages-Array ist erforderlich.' });
    }

    const jobId = `job-chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = {
      id: jobId,
      type: 'chat',
      characterId,
      chatId,
      status: 'running',
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const systemPrompt = buildCharacterSystemPrompt(character, storyContext, language);
        const contextSize = settings.contextWindowSize || 12;
        const recentMessages = messages.slice(-contextSize);

        const isGerman = language === 'de';
        const formattedMessages = recentMessages.map((m: any) => {
          let contentStr = m.content;
          if (m.image?.url && (m.role === 'lidii' || m.role === 'user')) {
            const playerAddress = character?.playerAddressName || 'Lidii';
            const imgNotice = isGerman
              ? `[${playerAddress} hat ein Bild/Foto angehängt${m.image.caption ? `: ${m.image.caption}` : ''}]`
              : `[${playerAddress} attached an image/photo${m.image.caption ? `: ${m.image.caption}` : ''}]`;
            contentStr = `${imgNotice}\n${contentStr}`;
          }
          return {
            role: (m.role === 'lidii' || m.role === 'user') ? ('user' as const) : ('assistant' as const),
            content: contentStr,
          };
        });

        const postHistoryAnchor = buildPostHistoryInstructions(character, language);
        const messagesPayload: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          ...formattedMessages,
        ];
        if (postHistoryAnchor.trim()) {
          messagesPayload.push({
            role: 'system',
            content: postHistoryAnchor.trim(),
          });
        }

        const result = await generateOpenRouterResponse({
          systemPrompt,
          messages: messagesPayload,
          temperature: settings.temperature ?? 0.88,
          maxTokens: settings.maxOutputTokens ? Math.min(settings.maxOutputTokens, 1800) : 1200,
          defaultModel: CHAT_DEFAULT_MODEL,
          modelOverride: settings.modelName,
          timeoutMs: 50000,
        });

        const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
        const charName = character?.name || (isDean ? 'Dean' : 'Charakter');

        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = {
          content: result.text,
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          role: isDean ? 'dean' : 'character',
          speakerName: charName,
        };
      } catch (genError: any) {
        console.error('Job error (chat):', genError);
        job.status = 'failed';
        job.error = genError.message || 'Unbekannter Fehler bei der Generierung.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Chat-Jobs.' });
  }
});

// 2. Create Start-Chat Job (Generates the opening scene / first message automatically for a new chat)
app.post('/api/jobs/start-chat', async (req: Request, res: Response) => {
  try {
    const { character, language = 'de', settings = {}, characterId, chatId, customPlot } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'Lidii';
    const isGerman = language === 'de';

    const jobId = `job-start-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = {
      id: jobId,
      type: 'start-chat',
      characterId,
      chatId,
      status: 'running',
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const startPlot = customPlot || character?.startPlot || character?.storyContext?.currentScene || 'Eine neue Szene beginnt.';
        const startBehavior = character?.startBehavior || character?.personality || 'Tritt selbstsicher und präsent auf.';

        const systemPrompt = buildCharacterSystemPrompt(character, {
          currentScene: startPlot,
          canonBackground: character?.background,
          keyEvents: [],
        }, language);

        const openingPrompt = isGerman
          ? `Beginne die erste Nachricht als ${charName} basierend auf dem Szenario:\n\n${startPlot}`
          : `Write the opening message as ${charName} based on the scenario:\n\n${startPlot}`;

        const result = await generateOpenRouterResponse({
          systemPrompt,
          messages: [{ role: 'user', content: openingPrompt }],
          temperature: settings.temperature ?? 0.9,
          maxTokens: 1100,
          defaultModel: CHAT_DEFAULT_MODEL,
          modelOverride: settings.modelName,
          timeoutMs: 50000,
        });

        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = {
          content: result.text,
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          role: isDean ? 'dean' : 'character',
          speakerName: charName,
        };
      } catch (genError: any) {
        console.error('Job error (start-chat):', genError);
        job.status = 'failed';
        job.error = genError.message || 'Fehler beim Starten der neuen Szene.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Start-Chat-Jobs.' });
  }
});

// 3. Create Imitate Me Generation Job
app.post('/api/jobs/imitate', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages-Array ist erforderlich.' });
    }

    const jobId = `job-imitate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = {
      id: jobId,
      type: 'imitate',
      characterId,
      chatId,
      status: 'running',
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
        const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
        const playerAddress = character?.playerAddressName || 'Lidii';
        const lidiiMessages = messages
          .filter((m: any) => m.role === 'lidii' || m.role === 'user')
          .map((m: any) => m.content);

        const systemPrompt = buildImitateSystemPrompt(character, storyContext, lidiiMessages, language);
        const contextSize = settings.contextWindowSize || 10;
        const recentMessages = messages.slice(-contextSize);

        const conversationHistoryText = recentMessages
          .map((m: any) => {
            const speaker = (m.role === 'lidii' || m.role === 'user') ? playerAddress : charName;
            return `[${speaker}]:\n${m.content}`;
          })
          .join('\n\n');

        const lastCharMsg = [...recentMessages].reverse().find((m: any) => m.role !== 'lidii' && m.role !== 'user');

        let prompt = language === 'de'
          ? `Hier ist der jüngste Verlauf des Rollenspiels:\n\n${conversationHistoryText}\n\n`
          : `Here is the recent dialogue in this scene:\n\n${conversationHistoryText}\n\n`;

        if (lastCharMsg) {
          prompt += language === 'de'
            ? `[LETZTE AKTION/WORTE VON ${charName.toUpperCase()}, AUF DIE DU JETZT ALS ${playerAddress.toUpperCase()} REAGIERST]:\n${lastCharMsg.content}\n\n`
            : `[LAST ACTION/WORDS BY ${charName.toUpperCase()} TO WHICH YOU ARE RESPONDING AS ${playerAddress.toUpperCase()}]:\n${lastCharMsg.content}\n\n`;
        }

        prompt += language === 'de'
          ? `AUFGABE:\nVerfasse jetzt den nächsten Spielzug AUSSCHLIESSLICH aus der Ich-Perspektive von ${playerAddress}.\nBeschreibe ihre Handlungen, Gefühle, Gedanken (in *kursiv*) und Dialoge. Keine Entscheidungen für ${charName}.`
          : `TASK:\nWrite the next turn EXCLUSIVELY in 1st person as ${playerAddress}.\nDescribe her actions, thoughts (in *italics*), feelings and dialogue. Do not dictate actions for ${charName}.`;

        const result = await generateOpenRouterResponse({
          systemPrompt,
          messages: [{ role: 'user', content: prompt }],
          temperature: settings.temperature ?? 0.85,
          maxTokens: 850,
          defaultModel: IMITATE_DEFAULT_MODEL,
          modelOverride: settings.modelName,
          timeoutMs: 50000,
        });

        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = {
          draft: result.text,
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          role: 'lidii',
          speakerName: playerAddress,
        };
      } catch (genError: any) {
        console.error('Job error (imitate):', genError);
        job.status = 'failed';
        job.error = genError.message || 'Unbekannter Fehler beim Imitate-Job.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Imitate-Jobs.' });
  }
});

// 4. Create Photo Generation Job (Character sends situational scene snapshot / description)
app.post('/api/jobs/photo', async (req: Request, res: Response) => {
  try {
    const { character, currentScene, language = 'de', characterId, chatId } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'Lidii';
    const isGerman = language === 'de';

    if (character?.imageFrequency === 'disabled') {
      return res.status(400).json({ error: `Situative Bilder sind für ${charName} in den Profileinstellungen deaktiviert.` });
    }

    const jobId = `job-photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = {
      id: jobId,
      type: 'photo',
      characterId,
      chatId,
      status: 'running',
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const imageStyle = character?.imageStyleDescription || (isDean ? 'Dunkel, atmosphärisch, schattig' : 'Passend zum Charakter');
        const systemPrompt = isGerman
          ? `Du bist die Figur ${charName.toUpperCase()}. Du schickst ${playerAddress} gerade ein situatives Bild oder Detail deiner aktuellen Umgebung bzw. deines Looks.
Schreibe eine kurze, intensive Begleitnachricht (1-3 Sätze) im typischen Schreibstil von ${charName}. Schweizer Rechtschreibung mit «ss» statt «ß». Eigene Gedanken in *kursiv*.`
          : `You are ${charName.toUpperCase()}. You are sending ${playerAddress} a situational snapshot or detail of your current surroundings/appearance.
Write a short accompanying message (1-3 sentences) in ${charName}'s characteristic voice.`;

        const userPrompt = isGerman
          ? `Szene: ${currentScene || 'Ort der Handlung'}.
Aussehen: ${character?.appearance || 'Beschrieben gemäss Profil'}.
Stil / Fokus: ${imageStyle}.
Aufgabe: Schreibe die Begleitnachricht zu diesem situativen Moment.`
          : `Scene: ${currentScene || 'Current scene'}. Style: ${imageStyle}. Write the accompanying message for this moment.`;

        const result = await generateOpenRouterResponse({
          systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.85,
          maxTokens: 350,
          defaultModel: CHAT_DEFAULT_MODEL,
          timeoutMs: 40000,
        });

        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = {
          content: result.text,
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          role: isDean ? 'dean' : 'character',
          speakerName: charName,
        };
      } catch (genError: any) {
        console.error('Job error (photo):', genError);
        job.status = 'failed';
        job.error = genError.message || 'Fehler beim Generieren der situativen Nachricht.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Photo-Jobs.' });
  }
});

// 5. Get Job Status
app.get(['/api/jobs/:id', '/api/job/:id'], (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job nicht gefunden.' });
  }
  res.json(job);
});

// Direct endpoint fallback for start-chat
app.post('/api/start-chat', async (req: Request, res: Response) => {
  try {
    const { character, language = 'de', settings = {}, customPlot } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'Lidii';
    const isGerman = language === 'de';

    const startPlot = customPlot || character?.startPlot || character?.storyContext?.currentScene || 'Eine neue Szene beginnt.';
    const startBehavior = character?.startBehavior || character?.personality || 'Tritt selbstsicher und präsent auf.';

    const systemPrompt = buildCharacterSystemPrompt(character, {
      currentScene: startPlot,
      canonBackground: character?.background,
      keyEvents: [],
    }, language);

    const openingPrompt = isGerman
      ? `AUFGABE FÜR DEN SZENENSTART:\nBeginne dieses neue Rollenspiel mit einem atmosphärischen, packenden ersten Spielzug aus der Sicht von ${charName.toUpperCase()}.\n\nSZENARIO / STARTPLOT:\n${startPlot}\n\nSTARTVERHALTEN:\n${startBehavior}\n\nREGELN:\n- Schreibe in der Ich-Perspektive von ${charName}.\n- Beschreibe die Umgebung, Handlungen, die körperliche Präsenz und gesprochene Worte in Anführungszeichen („...“).\n- Keine ständigen Pflicht-Gedankenblöcke.\n- Sprich ${playerAddress} direkt an oder stelle sie im Raum.\n- Bestimme NICHT die Handlungen oder Gefühle von ${playerAddress}.\n- Schweizer Rechtschreibung mit «ss» statt «ß».`
      : `TASK FOR OPENING SCENE:\nBegin this roleplay with an atmospheric opening turn from the perspective of ${charName.toUpperCase()}.\n\nSCENARIO / START PLOT:\n${startPlot}\n\nSTART BEHAVIOR:\n${startBehavior}\n\nRULES:\n- Write in 1st person as ${charName}.\n- Describe setting, actions, physical presence and spoken dialogue in quotes ("...").\n- Address ${playerAddress} directly.\n- Do not dictate actions or feelings for ${playerAddress}.`;

    const result = await generateOpenRouterResponse({
      systemPrompt,
      messages: [{ role: 'user', content: openingPrompt }],
      temperature: settings.temperature ?? 0.9,
      maxTokens: 1100,
      defaultModel: CHAT_DEFAULT_MODEL,
      modelOverride: settings.modelName,
      timeoutMs: 50000,
    });

    res.json({
      role: isDean ? 'dean' : 'character',
      speakerName: charName,
      content: result.text,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten der Szene.' });
  }
});

// Synchronous chat fallback
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {} } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const systemPrompt = buildCharacterSystemPrompt(character, storyContext, language);
    const contextSize = settings.contextWindowSize || 12;
    const recentMessages = messages.slice(-contextSize);

    const isGerman = language === 'de';
    const formattedMessages = recentMessages.map((m: any) => {
      let contentStr = m.content;
      if (m.image?.url && (m.role === 'lidii' || m.role === 'user')) {
        const playerAddress = character?.playerAddressName || 'Lidii';
        const imgNotice = isGerman
          ? `[${playerAddress} hat ein Bild/Foto angehängt${m.image.caption ? `: ${m.image.caption}` : ''}]`
          : `[${playerAddress} attached an image/photo${m.image.caption ? `: ${m.image.caption}` : ''}]`;
        contentStr = `${imgNotice}\n${contentStr}`;
      }
      return {
        role: (m.role === 'lidii' || m.role === 'user') ? ('user' as const) : ('assistant' as const),
        content: contentStr,
      };
    });

    const postHistoryAnchor = buildPostHistoryInstructions(character, language);
    const messagesPayload = [
      ...formattedMessages,
      {
        role: 'system' as const,
        content: postHistoryAnchor,
      },
    ];

    const result = await generateOpenRouterResponse({
      systemPrompt,
      messages: messagesPayload,
      temperature: settings.temperature ?? 0.88,
      maxTokens: settings.maxOutputTokens ? Math.min(settings.maxOutputTokens, 1800) : 1200,
      defaultModel: CHAT_DEFAULT_MODEL,
      modelOverride: settings.modelName,
      timeoutMs: 50000,
    });

    res.json({
      role: isDean ? 'dean' : 'character',
      speakerName: charName,
      content: result.text,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Chat-Generierung.' });
  }
});

// Synchronous imitate fallback
app.post('/api/imitate', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {} } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'Lidii';
    const lidiiMessages = (messages || [])
      .filter((m: any) => m.role === 'lidii' || m.role === 'user')
      .map((m: any) => m.content);

    const systemPrompt = buildImitateSystemPrompt(character, storyContext, lidiiMessages, language);
    const contextSize = settings.contextWindowSize || 10;
    const recentMessages = (messages || []).slice(-contextSize);

    const conversationHistoryText = recentMessages
      .map((m: any) => {
        const speaker = (m.role === 'lidii' || m.role === 'user') ? playerAddress : charName;
        return `[${speaker}]:\n${m.content}`;
      })
      .join('\n\n');

    const lastCharMsg = [...recentMessages].reverse().find((m: any) => m.role !== 'lidii' && m.role !== 'user');

    let prompt = language === 'de'
      ? `Hier ist der jüngste Verlauf des Rollenspiels:\n\n${conversationHistoryText}\n\n`
      : `Here is the recent dialogue in this scene:\n\n${conversationHistoryText}\n\n`;

    if (lastCharMsg) {
      prompt += language === 'de'
        ? `[LETZTE AKTION/WORTE VON ${charName.toUpperCase()}, AUF DIE DU JETZT ALS ${playerAddress.toUpperCase()} REAGIERST]:\n${lastCharMsg.content}\n\n`
        : `[LAST ACTION/WORDS BY ${charName.toUpperCase()} TO WHICH YOU ARE RESPONDING AS ${playerAddress.toUpperCase()}]:\n${lastCharMsg.content}\n\n`;
    }

    prompt += language === 'de'
      ? `AUFGABE:\nVerfasse jetzt den nächsten Spielzug AUSSCHLIESSLICH aus der Ich-Perspektive von ${playerAddress}.\nBeschreibe nur ihre Handlungen, Gefühle, Gedanken (in *kursiv*) und Dialoge.`
      : `TASK:\nWrite the next turn EXCLUSIVELY in 1st person as ${playerAddress}.\nDescribe her actions, thoughts (in *italics*), feelings and dialogue.`;

    const result = await generateOpenRouterResponse({
      systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.temperature ?? 0.85,
      maxTokens: 850,
      defaultModel: IMITATE_DEFAULT_MODEL,
      modelOverride: settings.modelName,
      timeoutMs: 50000,
    });

    res.json({
      draft: result.text,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Imitate-Entwurf.' });
  }
});

// Summarize scene context
app.post('/api/summarize', async (req: Request, res: Response) => {
  try {
    const { character, messages, currentScene, keyEvents, language = 'de' } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'Lidii';

    const isGerman = language === 'de';
    const prompt = isGerman
      ? `Fasse die jüngsten Ereignisse dieses Rollenspiels zwischen ${charName} und ${playerAddress} prägnant zusammen (1-2 Absätze). Verwende Schweizer Rechtschreibung mit «ss» statt «ß».
Ort: ${currentScene || 'Nicht spezifiziert'}
Letzte Nachrichten:\n${(messages || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`
      : `Summarize the recent events between ${charName} and ${playerAddress} concisely (1-2 paragraphs). Write in natural English.
Location: ${currentScene || 'Unspecified'}
Recent messages:\n${(messages || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`;

    const result = await generateOpenRouterResponse({
      systemPrompt: isGerman ? 'Du bist ein akribischer Kontext-Archivar.' : 'You are a meticulous scene and context archivist.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 600,
      defaultModel: SUMMARIZE_DEFAULT_MODEL,
      timeoutMs: 35000,
    });

    res.json({
      summary: result.text,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Zusammenfassung.' });
  }
});

// Diagnostics & Prompt Inspector Endpoint (Verifies exact Chub AI / CCv2 Prompt order)
app.post('/api/debug/inspect-prompt', (req: Request, res: Response) => {
  try {
    const { character, messages = [], storyContext, language = 'de', settings = {} } = req.body;
    const isGerman = language === 'de';

    const charName = character?.name?.trim() || 'Charakter';
    const playerAddress = character?.playerAddressName?.trim() || 'Lidii';
    const defaultGlobalPrompt = getGlobalDefaultSystemPrompt();

    let rawSystemPrompt = character?.systemPrompt && character.systemPrompt.trim()
      ? character.systemPrompt
      : defaultGlobalPrompt;

    const systemPromptCombined = buildCharacterSystemPrompt(character, storyContext, language);

    const contextSize = settings.contextWindowSize || 12;
    const recentMessages = messages.slice(-contextSize);

    const formattedMessages = recentMessages.map((m: any) => {
      let contentStr = m.content;
      if (m.image?.url && (m.role === 'lidii' || m.role === 'user')) {
        const imgNotice = isGerman
          ? `[${playerAddress} hat ein Bild/Foto angehängt${m.image.caption ? `: ${m.image.caption}` : ''}]`
          : `[${playerAddress} attached an image/photo${m.image.caption ? `: ${m.image.caption}` : ''}]`;
        contentStr = `${imgNotice}\n${contentStr}`;
      }
      return {
        role: (m.role === 'lidii' || m.role === 'user') ? ('user' as const) : ('assistant' as const),
        content: contentStr,
      };
    });

    const postHistoryAnchor = buildPostHistoryInstructions(character, language);

    const fullPayloadMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string; source?: string }> = [];
    if (systemPromptCombined.trim()) {
      fullPayloadMessages.push({
        role: 'system',
        content: systemPromptCombined.trim(),
        source: 'Character Card System Prompt & Character Definitions (CCv2)',
      });
    }

    formattedMessages.forEach((m, idx) => {
      fullPayloadMessages.push({
        role: m.role,
        content: m.content,
        source: idx === formattedMessages.length - 1 && m.role === 'user' ? 'Current User Message' : 'Chat History',
      });
    });

    if (postHistoryAnchor.trim()) {
      fullPayloadMessages.push({
        role: 'system',
        content: postHistoryAnchor.trim(),
        source: 'Post-History Instructions (CCv2)',
      });
    }

    res.json({
      status: 'ok',
      promptOrder: [
        '1. SYSTEM PROMPT (Resolved with {{original}} and Character System Prompt)',
        '2. CHARACTER DEFINITIONS (Description, Personality, Scenario, Character Book / Relevant Lore, Example Dialogue)',
        '3. CHAT HISTORY (Isolated to current chat session)',
        '4. POST-HISTORY INSTRUCTIONS (Directly follows history, before completion)',
      ],
      breakdown: {
        systemPrompt: systemPromptCombined,
        characterDefinition: character?.appearance || character?.description,
        personality: character?.personality,
        scenario: storyContext?.currentScene || character?.startPlot,
        characterBookLore: selectRelevantLore(character?.memories, storyContext?.memories, `${storyContext?.currentScene || ''} ${storyContext?.sceneSummary || ''}`, isGerman, 6),
        exampleDialogue: formatExampleDialogues(character?.exampleDialogues, charName, playerAddress),
        chatHistoryCount: formattedMessages.length,
        postHistoryInstructions: postHistoryAnchor,
        fullMessagesPayload: fullPayloadMessages,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Prompt-Inspektion.' });
  }
});

// Config status endpoint
app.get('/api/config', (req: Request, res: Response) => {
  const chatConfig = getResolvedOpenRouterConfig(CHAT_DEFAULT_MODEL);
  const imitateConfig = getResolvedOpenRouterConfig(IMITATE_DEFAULT_MODEL);

  res.json({
    status: 'ok',
    provider: 'openrouter',
    chatModel: chatConfig.model,
    imitateModel: imitateConfig.model,
    fallbackModel: FALLBACK_FREE_MODEL,
    hasKey: Boolean(chatConfig.apiKey),
    baseUrl: chatConfig.baseUrl,
    requestUrl: chatConfig.requestUrl,
    activeJobsCount: Array.from(jobs.values()).filter(j => j.status === 'running').length,
  });
});

// Production and Vite Middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Character RP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
