import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  applyPromptMacros,
  buildChatPayload,
  buildStartChatPayload,
} from './src/utils/promptBuilder';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Keep the current free OpenRouter models. The Chub-parity work is prompt/context work,
// not a model switch.
export const CHAT_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const IMITATE_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const IMITATE_FALLBACK_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const SUMMARIZE_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const FALLBACK_FREE_MODEL = 'google/gemma-4-26b-a4b-it:free';

export const DEFAULT_IMPERSONATION_PROMPT = `Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Don't write as {{char}} or system. Don't describe actions of {{char}}.`;

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

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > 7200000) jobs.delete(id);
  }
}, 300000).unref();

function numberSetting(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function promptConfigFromSettings(settings: any = {}) {
  return {
    contextSizeTokens: numberSetting(settings.contextSizeTokens, 32768, 2048, 262144),
    maxOutputTokens: numberSetting(settings.maxOutputTokens, 2200, 128, 8192),
    promptNote: typeof settings.promptNote === 'string' ? settings.promptNote : '',
    promptNoteDepth: numberSetting(settings.promptNoteDepth, 1, 0, 100),
    promptNoteRole:
      settings.promptNoteRole === 'user' || settings.promptNoteRole === 'assistant'
        ? settings.promptNoteRole
        : 'system',
    assistantPrefill: typeof settings.assistantPrefill === 'string' ? settings.assistantPrefill : '',
  } as const;
}

function generationSettings(settings: any, defaults: { temperature: number; maxTokens: number }) {
  return {
    temperature: numberSetting(settings?.temperature, defaults.temperature, 0, 2),
    maxTokens: numberSetting(settings?.maxOutputTokens, defaults.maxTokens, 64, 8192),
    topP: numberSetting(settings?.topP, 1, 0, 1),
    frequencyPenalty: numberSetting(settings?.frequencyPenalty, 0, -2, 2),
    presencePenalty: numberSetting(settings?.presencePenalty, 0, -2, 2),
    repetitionPenalty: numberSetting(settings?.repetitionPenalty, 1, 0, 2),
  };
}

function withAssistantPrefill(prefill: string, generated: string): string {
  const prefix = String(prefill || '');
  const text = String(generated || '');
  if (!prefix) return text;
  if (text.startsWith(prefix)) return text;
  return `${prefix}${text}`;
}

function imitateCardValue(character: any, authoritative: string, legacy: string): string {
  const value = character?.[authoritative] !== undefined ? character[authoritative] : character?.[legacy];
  return String(value ?? '').trim();
}

function imitateMacroValues(character: any, storyContext: any, activatedLore: string) {
  return {
    char: character?.name || 'Character',
    user: character?.playerAddressName || 'User',
    personality: String(character?.personality || ''),
    scenario: imitateCardValue(character, 'scenario', 'startPlot'),
    memory: activatedLore,
    summary: String(storyContext?.sceneSummary || ''),
    profile: String(storyContext?.profile || ''),
    example_dialogue: imitateCardValue(character, 'mesExample', 'exampleDialogues'),
  };
}

function buildImitateEvidenceSections(
  character: any,
  storyContext: any,
  activatedLore: string,
  language: 'de' | 'en'
): string {
  const values = imitateMacroValues(character, storyContext, activatedLore);
  const scenario = applyPromptMacros(values.scenario, values);
  const description = applyPromptMacros(imitateCardValue(character, 'description', 'appearance'), values);
  const currentScene = String(storyContext?.currentScene || '').trim();
  const chatMemory = String(storyContext?.sceneSummary || '').trim();
  const profile = String(storyContext?.profile || '').trim();
  const lore = applyPromptMacros(activatedLore, values).trim();

  const continuity = [
    scenario ? `Scenario:\n${scenario}` : '',
    currentScene ? `${language === 'de' ? 'Aktuelle Szene' : 'Current scene'}:\n${currentScene}` : '',
    chatMemory ? `Chat Memory:\n${chatMemory}` : '',
    profile ? `${language === 'de' ? 'User Profile / Persona' : 'User profile / persona'}:\n${profile}` : '',
  ].filter(Boolean).join('\n\n');

  const worldReference = [
    description ? `Character Card Description:\n${description}` : '',
    lore ? `Activated Character Book / Lore:\n${lore}` : '',
  ].filter(Boolean).join('\n\n');

  if (language === 'de') {
    return `=== OBJEKTIVE KONTINUITÄTSQUELLEN ===
${continuity || 'Keine zusätzlichen Kontinuitätsangaben vorhanden.'}

=== CARD-/WELTREFERENZ ===
${worldReference || 'Keine zusätzliche Card-/Lore-Referenz vorhanden.'}

WICHTIG ZUR WISSENSGRENZE DER SPIELERFIGUR:
- Technische Metadaten wie der Character-Card-Name oder interne Sprecherlabels sind NICHT automatisch Wissen der Spielerfigur.
- Scenario, Chat Memory, Description und Lore können objektive Welt- oder Beziehungstatsachen enthalten. Verborgene Details daraus sind NICHT automatisch Wissen der Spielerfigur.
- Die Spielerfigur kennt nur Dinge, die für sie ausdrücklich als bekannt etabliert sind, die sie selbst erlebt/geschrieben hat oder die sie in der Szene tatsächlich wahrnehmen bzw. von der anderen Figur hören konnte.
- Private Gedanken, innere Monologe, unbeobachtete Handlungen, geheime Beobachtungen oder verborgenes Wissen der anderen Figur werden NICHT zu Wissen der Spielerfigur, nur weil sie im Character-Text oder in einer CHARACTER-Nachricht stehen.
- Dass die andere Figur den Namen der Spielerfigur kennt oder sie heimlich beobachtet hat, beweist NICHT, dass die Spielerfigur davon weiss oder die andere Figur kennt.
- Erfinde keine frühere Bekanntschaft und lass die Spielerfigur keine verborgenen Handlungen als Tatsache behaupten, solange sie diese nicht wahrgenommen oder erfahren hat.
- Eine unbestätigte Ahnung, Nervosität, Unbehagen, Neugier oder Anziehung ist erlaubt, wenn sie als subjektives Gefühl der Spielerfigur formuliert wird. Sie darf daraus aber kein geheimes Stalking, keine verborgene Handlung und kein unbekanntes Motiv als Tatsache ableiten.
- Bewahre bereits etablierte objektive Szenenzustände. Ändere konkrete Zustände wie offen/geschlossen, Position oder Körperhaltung, gehaltene/platzierte Gegenstände oder vergleichbare physische Fakten nicht stillschweigend; eine Änderung braucht eine im neuen Spielzug tatsächlich ausgeführte Handlung oder ein etabliertes Ereignis.`;
  }

  return `=== OBJECTIVE CONTINUITY SOURCES ===
${continuity || 'No additional continuity facts are provided.'}

=== CARD / WORLD REFERENCE ===
${worldReference || 'No additional card or lore reference is provided.'}

IMPORTANT PLAYER-KNOWLEDGE BOUNDARY:
- Technical metadata such as the Character Card name or internal speaker labels is NOT automatically knowledge possessed by the player character.
- Scenario, Chat Memory, Description and Lore may establish objective world or relationship facts. Hidden details in those sources are NOT automatically known by the player character.
- The player character knows only facts explicitly established as known to them, facts they personally experienced/wrote, or things they could actually perceive in-scene or were directly told by the other character.
- Private thoughts, internal narration, unseen actions, secret observation or hidden knowledge belonging to the other character do NOT become player knowledge merely because they appear in Character text or a CHARACTER message.
- The other character knowing the player's name or secretly observing the player does NOT prove that the player knows this or knows the other character.
- Do not invent prior familiarity and do not make the player assert hidden actions as fact unless the player actually perceived or learned them.
- Unconfirmed unease, nervousness, curiosity, suspicion or attraction is allowed as a subjective player feeling when it fits the observable scene, but it must not turn hidden stalking, unseen actions or unknown motives into factual player knowledge.
- Preserve already established objective scene state. Do not silently change concrete states such as open/closed, position or posture, held/placed objects, or comparable physical facts; a change requires an action actually performed in the new turn or an established event.`;
}

// Chub exposes an Impersonation Prompt. We do the same, while keeping only a
// continuity/knowledge boundary around it so technical card metadata cannot leak
// into the player's in-world knowledge.
export function buildImitateSystemPrompt(
  character: any,
  storyContext: any,
  userPastMessages: string[],
  language: 'de' | 'en' = 'de',
  activatedLore: string = '',
  impersonationPrompt: string = DEFAULT_IMPERSONATION_PROMPT,
): string {
  const playerAddress = character?.playerAddressName || 'User';
  const values = imitateMacroValues(character, storyContext, activatedLore);
  const impersonationMacroValues = {
    ...values,
    char: language === 'de' ? 'die andere Figur' : 'the other character',
  };
  const configuredPrompt = applyPromptMacros(impersonationPrompt || DEFAULT_IMPERSONATION_PROMPT, impersonationMacroValues).trim();
  const evidenceSections = buildImitateEvidenceSections(character, storyContext, activatedLore, language);
  const examples = (userPastMessages || []).slice(-5).map((message, index) =>
    `[${language === 'de' ? 'Stilbeispiel' : 'Style example'} ${index + 1}]:\n${message.trim()}`
  ).join('\n\n');
  const perspectiveRule = examples
    ? (language === 'de'
        ? 'PERSPEKTIVE: Übernimm die in den Stilbeispielen tatsächlich etablierte Perspektive der Spielerfigur.'
        : 'PERSPECTIVE: Match the player perspective actually established by the style examples.')
    : (language === 'de'
        ? 'PERSPEKTIVE: Es gibt noch keine Stilbeispiele der Spielerfigur. Verwende standardmässig die erste Person Singular (ich/mein/mir/mich) und erzähle die Spielerfigur NICHT in der dritten Person.'
        : 'PERSPECTIVE: There are no player writing-style examples yet. Default to first-person singular (I/my/me) and do NOT narrate the player character in third person.');
  const continuationRule = language === 'de'
    ? 'FORTSETZUNG: Schreibe einen neuen Spielerzug, der auf den bisherigen Chat reagiert und die Szene aus Sicht der Spielerfigur fortsetzt. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht der Spielerfigur um. Wiederhole Details daraus nur, wenn die neue Handlung oder die neuen Worte der Spielerfigur direkt darauf reagieren.'
    : 'CONTINUATION: Write a new player turn that reacts to the chat so far and continues the scene from the player perspective. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from the player point of view. Reuse details from it only when the player’s new action or words directly respond to those details.';

  return [
    configuredPrompt,
    evidenceSections,
    perspectiveRule,
    continuationRule,
    examples
      ? `${language === 'de' ? '=== BISHERIGE STILBEISPIELE VON' : '=== PAST WRITING-STYLE EXAMPLES FROM'} ${playerAddress.toUpperCase()} ===\n${examples}\n\n${language === 'de' ? 'Nutze sie nur für Stimme, Perspektive und Stil. Übertrage keine nicht belegten Fakten.' : 'Use them only for voice, perspective, and style. Do not carry unsupported facts into the current scene.'}`
      : '',
    language === 'de'
      ? `AUSGABESPRACHE: Schreibe den vollständigen Entwurf ausschliesslich auf Deutsch. Gib NUR den eigentlichen Spielzug von ${playerAddress} aus, ohne Label, Erklärung oder Meta-Kommentar.`
      : `OUTPUT LANGUAGE: Write the complete draft in English only. Output ONLY ${playerAddress}'s actual roleplay turn, with no label, explanation, or meta commentary.`,
  ].filter(Boolean).join('\n\n');
}

export function buildImitateUserPrompt(
  character: any,
  messages: any[],
  language: 'de' | 'en' = 'de',
  contextWindowSize: number = 10
): string {
  const playerAddress = character?.playerAddressName || 'User';
  const recentMessages = Number.isFinite(contextWindowSize)
    ? (messages || []).slice(-Math.max(1, contextWindowSize))
    : (messages || []);
  const conversationHistoryText = recentMessages
    .map((message: any) => {
      const isPlayer = message.role === 'lidii' || message.role === 'user';
      const speaker = isPlayer ? `PLAYER (${playerAddress})` : 'CHARACTER';
      return `[${speaker}]:\n${message.content}`;
    })
    .join('\n\n');

  let prompt = language === 'de'
    ? `Hier ist der tatsächliche Rollenspielverlauf, der in den aktuellen Kontext passt. Sprecherlabels sind technische Labels und kein Beweis dafür, welche Namen die Spielerfigur in-world kennt:\n\n${conversationHistoryText}\n\n`
    : `Here is the actual roleplay history that fits in the current context. Speaker labels are technical labels and are not proof of which names the player character knows in-world:\n\n${conversationHistoryText}\n\n`;

  prompt += language === 'de'
    ? `AUFGABE: Verfasse jetzt ausschliesslich den nächsten Spielzug von ${playerAddress}. Bewahre exakt den belegten Beziehungs- und Wissensstand. Behandle private Gedanken, innere Erzählung, unbeobachtete Handlungen und geheime Informationen der anderen Figur NICHT als Wissen von ${playerAddress}. Erfinde keine frühere Bekanntschaft und keine Gewissheit über verborgene Handlungen. Subjektive Ahnung, Unbehagen, Neugier oder Anziehung darfst du schreiben, solange sie nicht als Wissen über geheimes Stalking oder unbekannte Motive dargestellt wird. Verändere bereits etablierte physische Szenenzustände nur, wenn der neue Spielzug selbst eine plausible Handlung dafür ausführt oder ein etabliertes Ereignis die Änderung verursacht.`
    : `TASK: Write only ${playerAddress}'s next roleplay turn. Preserve exactly the established relationship and knowledge state. Do NOT treat the other character's private thoughts, internal narration, unseen actions or secret information as knowledge possessed by ${playerAddress}. Do not invent prior familiarity or certainty about hidden actions. You may write subjective unease, curiosity, suspicion or attraction when it fits the observable scene, but never present hidden stalking or unknown motives as facts known by the player. Change an already established physical scene state only when the new turn itself performs a plausible action that causes the change or an established event causes it.`;
  prompt += language === 'de'
    ? `\n\nFORTSETZUNG: Reagiere als ${playerAddress} auf den vorhandenen Verlauf und schreibe etwas Neues. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht von ${playerAddress} um. Wiederhole ein Detail daraus nur, wenn ${playerAddress}s neue Handlung oder Worte direkt darauf reagieren.`
    : `\n\nCONTINUATION: React as ${playerAddress} to the existing history and write something new. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from ${playerAddress}'s point of view. Repeat a detail from it only when ${playerAddress}'s new action or words directly respond to that detail.`;
  return prompt;
}

function cleanEnvString(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/[\u2000-\u206F\uFEFF\u00A0\r\n\t]/g, '').trim();
}

function getResolvedOpenRouterConfig(defaultModel: string, modelOverride?: string) {
  let envKey = cleanEnvString(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY).replace(/\s+/g, '');
  let envBaseUrl = cleanEnvString(process.env.OPENROUTER_BASE_URL);
  if (envBaseUrl.startsWith('sk-') && !envKey.startsWith('sk-')) {
    envKey = envBaseUrl;
    envBaseUrl = 'https://openrouter.ai/api/v1';
  }
  let baseUrl = envBaseUrl;
  if (!baseUrl || (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://'))) baseUrl = 'https://openrouter.ai/api/v1';
  baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
  const requestUrl = baseUrl.endsWith('/api/v1') || baseUrl.endsWith('/v1')
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/api/v1/chat/completions`;

  let finalModel = cleanEnvString(modelOverride || process.env.OPENROUTER_MODEL);
  if (!finalModel || finalModel.startsWith('http') || finalModel.startsWith('sk-') || finalModel === 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free') {
    finalModel = defaultModel;
  }
  return { apiKey: envKey, baseUrl, requestUrl, model: finalModel };
}

function cleanRoleplayOutput(raw: string): string {
  if (!raw) return '';
  let cleaned = raw;
  cleaned = cleaned.replace(/<(think|thought|reasoning|reflection|internal|analysis|antThinking|scratchpad|plan)>[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/^<(think|thought|reasoning|reflection|internal|analysis|antThinking|scratchpad|plan)>[\s\S]*?(?:<\/think>|<\/thought>|<\/reasoning>|<\/antThinking>|<\/scratchpad>|<\/plan>|\n\n)/i, '');
  cleaned = cleaned.replace(/^<(think|thought|reasoning|reflection|internal|analysis|antThinking|scratchpad|plan)>[\s\S]*$/i, '');
  return cleaned.trim();
}

export async function generateOpenRouterResponse({
  systemPrompt,
  messages,
  temperature = 0.88,
  maxTokens = 1400,
  topP = 1,
  frequencyPenalty = 0,
  presencePenalty = 0,
  repetitionPenalty = 1,
  defaultModel,
  modelOverride,
  timeoutMs = 50000,
}: {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repetitionPenalty?: number;
  defaultModel: string;
  modelOverride?: string;
  timeoutMs?: number;
}): Promise<{ text: string; modelUsed: string; latencyMs: number }> {
  const startTime = Date.now();
  const config = getResolvedOpenRouterConfig(defaultModel, modelOverride);
  if (!config.apiKey) throw new Error('OPENROUTER_API_KEY ist auf dem Server nicht konfiguriert.');

  const requestBody: Record<string, any> = {
    model: config.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature,
    max_tokens: maxTokens,
  };
  if (topP !== 1) requestBody.top_p = topP;
  if (frequencyPenalty !== 0) requestBody.frequency_penalty = frequencyPenalty;
  if (presencePenalty !== 0) requestBody.presence_penalty = presencePenalty;
  if (repetitionPenalty !== 1) requestBody.repetition_penalty = repetitionPenalty;

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
    if (networkError.name === 'AbortError') throw new Error(`OpenRouter Timeout nach ${timeoutMs / 1000}s für Modell ${config.model}.`);
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

  const contentType = response.headers?.get('content-type') || '';
  const isHtml = rawText.trim().startsWith('<') || (contentType.includes('text/html') && !contentType.includes('json'));
  if (isHtml) throw new Error(`OpenRouter antwortete mit HTTP ${response.status} ${response.statusText} (HTML-Antwort erhalten von ${config.requestUrl}).`);

  let rawData: any;
  try {
    rawData = JSON.parse(rawText);
  } catch (jsonErr: any) {
    throw new Error(`Ungültiges JSON von OpenRouter (HTTP ${response.status}): ${rawText.substring(0, 160)}`);
  }

  let text = '';
  let modelUsed = config.model;
  const hasErrorInPayload = !!rawData?.error;
  if (response.ok && !hasErrorInPayload) {
    if (rawData.choices?.[0]?.message?.content) {
      const content = rawData.choices[0].message.content;
      text = Array.isArray(content) ? content.map((part: any) => (typeof part === 'string' ? part : part?.text || '')).join('') : String(content);
      modelUsed = rawData.model || config.model;
    } else if (rawData.choices?.[0]?.message?.refusal) {
      text = rawData.choices[0].message.refusal;
      modelUsed = rawData.model || config.model;
    }
  }

  if (!text || hasErrorInPayload) {
    const errMsg = rawData?.error?.message || rawData?.error || (response.status !== 200 ? `HTTP ${response.status}: ${rawText.substring(0, 200)}` : 'Keine Antwort im choices-Array.');
    const errMsgStr = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);
    const transient = ['overload', '503', 'rate limit', 'temporarily', 'unavailable', 'busy'].some(token => errMsgStr.toLowerCase().includes(token));
    if (transient) {
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
            const fallbackContent = fallbackData.choices?.[0]?.message?.content;
            if (fallbackContent) {
              text = Array.isArray(fallbackContent)
                ? fallbackContent.map((part: any) => (typeof part === 'string' ? part : part?.text || '')).join('')
                : String(fallbackContent);
              modelUsed = fallbackData.model || FALLBACK_FREE_MODEL;
            }
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback request also failed', fallbackError);
      }
    }
    if (!text) {
      if (response.status === 401) throw new Error(`OpenRouter Authentifizierungsfehler (HTTP 401): ${errMsgStr}. Bitte prüfe deinen OPENROUTER_API_KEY.`);
      if (response.status === 402) throw new Error(`OpenRouter Guthaben/Limit-Fehler (HTTP 402): ${errMsgStr}`);
      throw new Error(`OpenRouter API Fehler (HTTP ${response.status}): ${errMsgStr}`);
    }
  }

  const cleanedText = cleanRoleplayOutput(text);
  if (!cleanedText) {
    throw new Error(`OpenRouter lieferte für Modell ${modelUsed} keinen nutzbaren finalen Antworttext.`);
  }
  return { text: cleanedText, modelUsed, latencyMs: Date.now() - startTime };
}

function createJob(type: ServerJob['type'], characterId?: string, chatId?: string): ServerJob {
  const job: ServerJob = {
    id: `job-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    characterId,
    chatId,
    status: 'running',
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

function startGenerationMessages(payload: ReturnType<typeof buildStartChatPayload>) {
  const tail = [...payload.messages.slice(1)];
  const prefillMessage = payload.assistantPrefill && tail.at(-1)?.role === 'assistant' ? tail.pop() : undefined;
  const postHistoryMessage = payload.postHistoryInstructions && tail.at(-1)?.role === 'system' ? tail.pop() : undefined;
  return [
    ...tail,
    payload.openingMessage,
    ...(postHistoryMessage ? [postHistoryMessage] : []),
    ...(prefillMessage ? [prefillMessage] : []),
  ];
}

export function extractGreetingLocalizationOutput(raw: string): string {
  const cleaned = cleanRoleplayOutput(String(raw || '')).trim();
  if (!cleaned) throw new Error('Greeting localization returned no usable text.');

  const tagged = cleaned.match(/<greeting>\s*([\s\S]*?)\s*<\/greeting>/i);
  if (tagged?.[1]?.trim()) return tagged[1].trim();

  const fenced = cleaned.match(/^```(?:text|markdown)?\s*\n([\s\S]*?)\n```$/i);
  const candidate = (fenced?.[1] || cleaned).trim();
  const suspiciousLead = /^(?:we need to|we should|the task|the instruction|original german|let['’]s translate|translation notes?|analysis\s*:)/i;
  const suspiciousMeta = /(?:preserv(?:e|ing).*punctuation|we(?:'|’)ll translate|we(?:'|’)ll preserve|check punctuation|thus final english)/i;
  if (suspiciousLead.test(candidate) || suspiciousMeta.test(candidate.slice(0, 1200))) {
    throw new Error('Greeting localization returned analysis instead of the translated greeting.');
  }
  return candidate;
}

async function generateLocalizedGreeting(greeting: string, language: 'de' | 'en') {
  const targetName = language === 'en' ? 'English' : 'German';
  const systemPrompt = `You are a precise literary translator. Translate the supplied roleplay greeting into ${targetName}. If it is already fully in ${targetName}, keep it unchanged. Preserve meaning, point of view, tone, Markdown, paragraph breaks, proper names, dialogue and all double-curly-brace Character Card macros verbatim. Do not continue the scene and do not explain your work. Put ONLY the final greeting between <greeting> and </greeting> tags.`;
  const request = {
    systemPrompt,
    messages: [{ role: 'user' as const, content: greeting }],
    temperature: 0.05,
    maxTokens: 1800,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    repetitionPenalty: 1,
  };

  const attempts = [
    { model: FALLBACK_FREE_MODEL, timeoutMs: 45000 },
    { model: CHAT_DEFAULT_MODEL, timeoutMs: 60000 },
  ];
  let lastError: any;
  for (const attempt of attempts) {
    try {
      const result = await generateOpenRouterResponse({
        ...request,
        defaultModel: attempt.model,
        timeoutMs: attempt.timeoutMs,
      });
      return {
        ...result,
        text: extractGreetingLocalizationOutput(result.text),
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`Greeting localization with ${attempt.model} failed: ${error?.message || error}`);
    }
  }
  throw new Error(lastError?.message || 'Greeting localization failed.');
}

async function generateCharacterReply(character: any, messages: any[], storyContext: any, language: 'de' | 'en', settings: any) {
  const promptConfig = promptConfigFromSettings(settings);
  const payload = buildChatPayload({ character, messages, storyContext, language, promptConfig });
  const [systemMessage, ...messagesPayload] = payload.messages;
  const generation = generationSettings(settings, { temperature: 0.88, maxTokens: 2200 });
  const result = await generateOpenRouterResponse({
    systemPrompt: systemMessage.content,
    messages: messagesPayload,
    ...generation,
    defaultModel: CHAT_DEFAULT_MODEL,
    modelOverride: settings?.modelName,
    timeoutMs: 180000,
  });
  return { ...result, text: withAssistantPrefill(payload.assistantPrefill, result.text), payload };
}

async function generateStartReply(character: any, language: 'de' | 'en', settings: any, customPlot?: string) {
  const promptConfig = promptConfigFromSettings(settings);
  const payload = buildStartChatPayload({ character, language, scenarioOverride: customPlot, promptConfig });
  const generation = generationSettings(settings, { temperature: 0.9, maxTokens: 2200 });
  const result = await generateOpenRouterResponse({
    systemPrompt: payload.messages[0].content,
    messages: startGenerationMessages(payload),
    ...generation,
    defaultModel: CHAT_DEFAULT_MODEL,
    modelOverride: settings?.modelName,
    timeoutMs: 180000,
  });
  return { ...result, text: withAssistantPrefill(payload.assistantPrefill, result.text), payload };
}

async function generateImitateReply(character: any, messages: any[], storyContext: any, language: 'de' | 'en', settings: any) {
  const promptConfig = { ...promptConfigFromSettings(settings), promptNote: '', assistantPrefill: '' };
  const contextPayload = buildChatPayload({ character, messages, storyContext, language, promptConfig });
  const packedMessages = contextPayload.rawHistoryKept;
  const playerMessages = packedMessages
    .filter((message: any) => message.role === 'lidii' || message.role === 'user')
    .map((message: any) => message.content);
  const activatedLore = contextPayload.activatedCharacterBookEntries.map(entry => entry.content).join('\n\n');
  const systemPrompt = buildImitateSystemPrompt(
    character,
    storyContext,
    playerMessages,
    language,
    activatedLore,
    typeof settings?.impersonationPrompt === 'string' ? settings.impersonationPrompt : DEFAULT_IMPERSONATION_PROMPT,
  );
  const prompt = buildImitateUserPrompt(character, packedMessages, language, Number.POSITIVE_INFINITY);
  const generation = generationSettings(settings, { temperature: 0.85, maxTokens: 1200 });
  const request = {
    systemPrompt,
    messages: [{ role: 'user' as const, content: prompt }],
    ...generation,
  };

  try {
    return await generateOpenRouterResponse({
      ...request,
      defaultModel: IMITATE_DEFAULT_MODEL,
      modelOverride: settings?.modelName,
      timeoutMs: String(settings?.modelName || '').trim() ? 90000 : 70000,
    });
  } catch (primaryError: any) {
    // Respect an explicit model override. Automatic fallback only applies to the
    // built-in free Imitate model.
    if (String(settings?.modelName || '').trim()) throw primaryError;

    console.warn(
      `Imitate model ${IMITATE_DEFAULT_MODEL} failed (${primaryError?.message || primaryError}). ` +
      `Retrying with free quality fallback ${IMITATE_FALLBACK_MODEL}...`
    );

    try {
      return await generateOpenRouterResponse({
        ...request,
        defaultModel: IMITATE_FALLBACK_MODEL,
        timeoutMs: 90000,
      });
    } catch (fallbackError: any) {
      throw new Error(
        `Imitate Me konnte weder mit ${IMITATE_DEFAULT_MODEL} noch mit ${IMITATE_FALLBACK_MODEL} einen Entwurf erzeugen. ` +
        `Letzter Fehler: ${fallbackError?.message || fallbackError}`
      );
    }
  }
}

// -------------------------------------------------------------
// ASYNC JOB ENDPOINTS
// -------------------------------------------------------------

app.post('/api/jobs/chat', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'Messages-Array ist erforderlich.' });
    const job = createJob('chat', characterId, chatId);
    res.json({ jobId: job.id, status: 'running' });
    (async () => {
      try {
        const result = await generateCharacterReply(character, messages, storyContext, language, settings);
        const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
        const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = { content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: isDean ? 'dean' : 'character', speakerName: charName };
      } catch (error: any) {
        console.error('Job error (chat):', error);
        job.status = 'failed';
        job.error = error.message || 'Unbekannter Fehler bei der Generierung.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Chat-Jobs.' });
  }
});

app.post('/api/jobs/start-chat', async (req: Request, res: Response) => {
  try {
    const { character, language = 'de', settings = {}, characterId, chatId, customPlot } = req.body;
    const job = createJob('start-chat', characterId, chatId);
    res.json({ jobId: job.id, status: 'running' });
    (async () => {
      try {
        const result = await generateStartReply(character, language, settings, customPlot);
        const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
        const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = { content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: isDean ? 'dean' : 'character', speakerName: charName };
      } catch (error: any) {
        console.error('Job error (start-chat):', error);
        job.status = 'failed';
        job.error = error.message || 'Fehler beim Starten der neuen Szene.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Start-Chat-Jobs.' });
  }
});

app.post('/api/jobs/imitate', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'Messages-Array ist erforderlich.' });
    const job = createJob('imitate', characterId, chatId);
    res.json({ jobId: job.id, status: 'running' });
    (async () => {
      try {
        const result = await generateImitateReply(character, messages, storyContext, language, settings);
        const playerAddress = character?.playerAddressName || 'User';
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = { draft: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: 'lidii', speakerName: playerAddress };
      } catch (error: any) {
        console.error('Job error (imitate):', error);
        job.status = 'failed';
        job.error = error.message || 'Unbekannter Fehler beim Imitate-Job.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Imitate-Jobs.' });
  }
});

app.post('/api/jobs/photo', async (req: Request, res: Response) => {
  try {
    const { character, currentScene, language = 'de', characterId, chatId } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'User';
    const isGerman = language === 'de';
    if (character?.imageFrequency === 'disabled') return res.status(400).json({ error: `Situative Szenenmomente sind für ${charName} deaktiviert.` });

    const job = createJob('photo', characterId, chatId);
    res.json({ jobId: job.id, status: 'running' });
    (async () => {
      try {
        const imageStyle = character?.imageStyleDescription || 'Passend zum Charakter';
        const systemPrompt = isGerman
          ? `Du bist die Figur ${charName}. Schreibe für ${playerAddress} einen kurzen situativen Szenenmoment oder ein Detail deiner aktuellen Umgebung bzw. deines Looks. Die Ausgabe ist ausschliesslich textlich: Behaupte nicht, dass du ein echtes Bild oder Foto gesendet hast. Schreibe 1-3 Sätze passend zur Character Card.`
          : `You are ${charName}. Write ${playerAddress} a short situational scene moment or detail of the current surroundings/appearance. The output is text only: do not claim that you sent a real image or photo. Write 1-3 sentences consistent with the Character Card.`;
        const userPrompt = isGerman
          ? `Szene: ${currentScene || 'Ort der Handlung'}.\nAussehen: ${character?.description || character?.appearance || 'gemäss Character Card'}.\nStil / Fokus: ${imageStyle}.`
          : `Scene: ${currentScene || 'Current scene'}.\nAppearance: ${character?.description || character?.appearance || 'according to the Character Card'}.\nStyle / focus: ${imageStyle}.`;
        const result = await generateOpenRouterResponse({ systemPrompt, messages: [{ role: 'user', content: userPrompt }], temperature: 0.85, maxTokens: 350, defaultModel: CHAT_DEFAULT_MODEL, timeoutMs: 40000 });
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = { content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: isDean ? 'dean' : 'character', speakerName: charName };
      } catch (error: any) {
        console.error('Job error (photo):', error);
        job.status = 'failed';
        job.error = error.message || 'Fehler beim Generieren des Szenenmoments.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Szenenmoment-Jobs.' });
  }
});

app.get(['/api/jobs/:id', '/api/job/:id'], (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job nicht gefunden.' });
  res.json(job);
});

// -------------------------------------------------------------
// SYNCHRONOUS FALLBACKS
// -------------------------------------------------------------

app.post('/api/start-chat', async (req: Request, res: Response) => {
  try {
    const { character, language = 'de', settings = {}, customPlot } = req.body;
    const result = await generateStartReply(character, language, settings, customPlot);
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    res.json({ role: isDean ? 'dean' : 'character', speakerName: charName, content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten der Szene.' });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { character, messages = [], storyContext, language = 'de', settings = {} } = req.body;
    const result = await generateCharacterReply(character, messages, storyContext, language, settings);
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    res.json({ role: isDean ? 'dean' : 'character', speakerName: charName, content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Chat-Generierung.' });
  }
});

app.post('/api/imitate', async (req: Request, res: Response) => {
  try {
    const { character, messages = [], storyContext, language = 'de', settings = {} } = req.body;
    const result = await generateImitateReply(character, messages, storyContext, language, settings);
    res.json({ draft: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, speakerName: character?.playerAddressName || 'User' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Imitate-Entwurf.' });
  }
});

// Chub-style Chat Memory: summarize only messages that no longer fit into the
// active prompt context. If everything still fits, the current memory is sufficient.
app.post('/api/summarize', async (req: Request, res: Response) => {
  try {
    const {
      character,
      messages = [],
      currentScene,
      currentSummary = '',
      language = 'de',
      settings = {},
    } = req.body;
    const promptConfig = { ...promptConfigFromSettings(settings), promptNote: '', assistantPrefill: '' };
    const contextPayload = buildChatPayload({
      character,
      messages,
      storyContext: { currentScene: currentScene || '', sceneSummary: currentSummary || '', keyEvents: [] },
      language,
      promptConfig,
    });
    const outOfContextMessages = contextPayload.rawHistoryDropped;
    if (outOfContextMessages.length === 0) {
      return res.json({ summary: currentSummary || '', skipped: true, reason: 'all_messages_still_in_context' });
    }

    const charName = character?.name || 'Character';
    const playerAddress = character?.playerAddressName || 'User';
    const isGerman = language === 'de';
    const oldMessages = outOfContextMessages
      .map((message: any) => `${message.role === 'lidii' || message.role === 'user' ? playerAddress : charName}: ${message.content}`)
      .join('\n\n');
    const prompt = isGerman
      ? `Aktualisiere das bestehende Chat Memory. Bewahre wichtige Fakten, Beziehungen, Entscheidungen, Enthüllungen und fortwirkende Entwicklungen. Erfinde nichts.\n\nBisheriges Memory:\n${currentSummary || '(leer)'}\n\nNeu aus dem direkten Kontext herausgefallene Nachrichten:\n${oldMessages}`
      : `Update the existing Chat Memory. Preserve important facts, relationships, decisions, revelations, and developments that still matter. Invent nothing.\n\nExisting memory:\n${currentSummary || '(empty)'}\n\nNew messages that have fallen out of direct context:\n${oldMessages}`;
    const result = await generateOpenRouterResponse({
      systemPrompt: isGerman
        ? 'Du bist ein präziser Chat-Memory-Archivar. Schreibe ausschliesslich die aktualisierte Zusammenfassung auf Deutsch.'
        : 'You are a precise Chat Memory archivist. Output only the updated summary in English.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.25,
      maxTokens: 900,
      defaultModel: SUMMARIZE_DEFAULT_MODEL,
      timeoutMs: 35000,
    });
    res.json({ summary: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, summarizedMessages: outOfContextMessages.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Zusammenfassung.' });
  }
});

app.post('/api/debug/inspect-prompt', (req: Request, res: Response) => {
  try {
    const { character, messages = [], storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    const payload = buildChatPayload({ character, messages, storyContext, language, promptConfig: promptConfigFromSettings(settings) });
    const currentUserMessage = [...payload.chatHistory].reverse().find(message => message.role === 'user');
    res.json({
      status: 'ok',
      characterId: characterId || character?.id,
      chatId,
      language,
      systemPrompt: payload.systemPrompt,
      characterDefinitions: payload.characterDefinitions,
      activatedCharacterBookEntries: payload.activatedCharacterBookEntries,
      chatHistory: payload.chatHistory,
      currentUserMessage,
      chatMemory: payload.chatMemory,
      characterNote: payload.characterNote,
      promptNote: payload.promptNote,
      assistantPrefill: payload.assistantPrefill,
      postHistoryInstructions: payload.postHistoryInstructions,
      contextSizeTokens: payload.contextSizeTokens,
      historyTokenBudget: payload.historyTokenBudget,
      estimatedPromptTokens: payload.estimatedPromptTokens,
      rawHistoryKeptCount: payload.rawHistoryKept.length,
      rawHistoryDroppedCount: payload.rawHistoryDropped.length,
      finalMessages: payload.messages,
      breakdown: {
        systemPrompt: payload.systemPrompt,
        characterDefinition: payload.characterDefinitions,
        characterBookLore: payload.activatedCharacterBookEntries.map(entry => entry.content).join('\n\n'),
        chatMemory: payload.chatMemory,
        characterNote: payload.characterNote,
        promptNote: payload.promptNote,
        assistantPrefill: payload.assistantPrefill,
        chatHistoryCount: payload.chatHistory.length,
        rawHistoryKeptCount: payload.rawHistoryKept.length,
        rawHistoryDroppedCount: payload.rawHistoryDropped.length,
        contextSizeTokens: payload.contextSizeTokens,
        estimatedPromptTokens: payload.estimatedPromptTokens,
        postHistoryInstructions: payload.postHistoryInstructions,
        fullMessagesPayload: payload.messages,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Prompt-Inspektion.' });
  }
});

app.post('/api/localize-greeting', async (req: Request, res: Response) => {
  try {
    const { greeting, language = 'de' } = req.body || {};
    if (typeof greeting !== 'string' || !greeting.trim()) {
      return res.status(400).json({ error: 'Greeting text is required.' });
    }
    if (language !== 'de' && language !== 'en') {
      return res.status(400).json({ error: 'Unsupported greeting language.' });
    }
    const result = await generateLocalizedGreeting(greeting, language);
    res.json({ content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Greeting localization failed.' });
  }
});

app.get('/api/config', (_req: Request, res: Response) => {
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
    activeJobsCount: Array.from(jobs.values()).filter(job => job.status === 'running').length,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Character RP Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') startServer();
