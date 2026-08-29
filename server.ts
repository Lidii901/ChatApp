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
    if (now - job.createdAt > 7200000) jobs.delete(id);
  }
}, 300000).unref();

// Character Card V2 prompt construction is shared by chat and diagnostics.
import { buildChatPayload, buildStartChatPayload } from './src/utils/promptBuilder';

function imitateCardValue(character: any, authoritative: string, legacy: string): string {
  const value = character?.[authoritative] !== undefined
    ? character[authoritative]
    : character?.[legacy];
  return String(value ?? '').trim();
}

function resolveImitateMacros(text: string, character: any): string {
  return String(text || '')
    .replace(/{{char}}/gi, character?.name || 'Character')
    .replace(/{{user}}/gi, character?.playerAddressName || 'User');
}

function buildImitateEvidenceSections(
  character: any,
  storyContext: any,
  activatedLore: string,
  language: 'de' | 'en'
): string {
  const scenario = resolveImitateMacros(imitateCardValue(character, 'scenario', 'startPlot'), character);
  const description = resolveImitateMacros(imitateCardValue(character, 'description', 'appearance'), character);
  const currentScene = String(storyContext?.currentScene || '').trim();
  const chatMemory = String(storyContext?.sceneSummary || '').trim();
  const lore = resolveImitateMacros(activatedLore, character).trim();

  const continuity = [
    scenario ? `${language === 'de' ? 'Scenario' : 'Scenario'}:\n${scenario}` : '',
    currentScene ? `${language === 'de' ? 'Aktuelle Szene' : 'Current scene'}:\n${currentScene}` : '',
    chatMemory ? `${language === 'de' ? 'Chat Memory' : 'Chat memory'}:\n${chatMemory}` : '',
  ].filter(Boolean).join('\n\n');

  const worldReference = [
    description ? `Character Card Description:\n${description}` : '',
    lore ? `Activated Character Book / Lore:\n${lore}` : '',
  ].filter(Boolean).join('\n\n');

  if (language === 'de') {
    return `=== KONTINUITÄT & WISSEN DER SPIELERFIGUR ===
${continuity || 'Keine zusätzlichen Kontinuitätsangaben vorhanden.'}

=== CARD-/WELTREFERENZ ===
${worldReference || 'Keine zusätzliche Card-/Lore-Referenz vorhanden.'}

WICHTIG ZUR WISSENSGRENZE:
- Technische Metadaten wie der Character-Card-Name, interne Sprecherlabels oder Felder der Card sind NICHT automatisch Wissen der Spielerfigur.
- Eine Beziehung, frühere Begegnung, Vertrautheit, Kenntnis des Namens oder gemeinsames Erlebnis darf nur als bereits bekannt behandelt werden, wenn es durch Scenario, Chat Memory oder den tatsächlichen Chatverlauf belegt ist.
- Dass die andere Figur den Namen der Spielerfigur kennt oder sie persönlich anspricht, beweist NICHT, dass die Spielerfigur umgekehrt die andere Figur kennt.
- Description und Lore sind Welt-/Card-Referenz. Nutze sie zur Konsistenz, aber behandle darin enthaltene nicht beobachtete Informationen nicht automatisch als Wissen der Spielerfigur.
- Wenn ein Fakt über Bekanntschaft oder Vorgeschichte nicht belegt ist, erfinde ihn nicht. Formulierungen wie „wie immer“, „wieder“, „natürlich war er es“ oder Erinnerungen an frühere Begegnungen sind dann unzulässig.`;
  }

  return `=== PLAYER CONTINUITY & KNOWLEDGE ===
${continuity || 'No additional continuity facts are provided.'}

=== CARD / WORLD REFERENCE ===
${worldReference || 'No additional card or lore reference is provided.'}

IMPORTANT KNOWLEDGE BOUNDARY:
- Technical metadata such as the Character Card name, internal speaker labels, or card fields is NOT automatically knowledge possessed by the player character.
- A prior relationship, previous meeting, familiarity, knowledge of the character's name, or shared history may only be treated as established when Scenario, Chat Memory, or the actual conversation history establishes it.
- The other character knowing or using the player's name does NOT prove reciprocal familiarity or that the player knows the other character.
- Description and Lore are world/card reference. Use them for consistency, but do not automatically turn unobserved information in them into player-character knowledge.
- If familiarity or shared history is not established, do not invent it. Avoid unsupported continuity claims such as “as always”, “again”, “of course it was them”, or memories of earlier encounters.`;
}

// Build System Prompt for "Imitate Me" (player-character candidate draft).
// This deliberately keeps card metadata separate from in-world player knowledge.
export function buildImitateSystemPrompt(
  character: any,
  storyContext: any,
  userPastMessages: string[],
  language: 'de' | 'en' = 'de',
  activatedLore: string = ''
): string {
  const playerAddress = character?.playerAddressName || 'Lidii';
  const isGerman = language === 'de';
  const evidenceSections = buildImitateEvidenceSections(character, storyContext, activatedLore, language);

  const pastExamplesSection = userPastMessages && userPastMessages.length > 0
    ? (isGerman
        ? `=== BISHERIGE BEISPIELE VON ${playerAddress.toUpperCase()}S SCHREIBSTIL ===\n${userPastMessages.slice(-5).map((msg, i) => `[Beispiel ${i + 1}]:\n${msg.trim()}`).join('\n\n')}\n\nNutze diese Beispiele für Stil und Stimme. Übertrage daraus keine Fakten in eine andere Situation, die nicht auch durch den aktuellen Verlauf belegt sind.`
        : `=== PAST EXAMPLES OF ${playerAddress.toUpperCase()}'S WRITING STYLE ===\n${userPastMessages.slice(-5).map((msg, i) => `[Example ${i + 1}]:\n${msg.trim()}`).join('\n\n')}\n\nUse these examples for voice and style. Do not carry facts into a different situation unless the current continuity also establishes them.`)
    : '';

  if (isGerman) {
    return `DU BIST DER PERSÖNLICHE SCHREIB-ASSISTENT FÜR DIE SPIELERFIGUR „${playerAddress.toUpperCase()}“.

DEINE EINZIGE AUFGABE:
Generiere den nächsten Spielzug AUSSCHLIESSLICH aus der Sicht von ${playerAddress} als editierbaren Textentwurf.

=== STRIKTE ROLLENTRENNUNG & PERSPEKTIVE ===
1. Du schreibst zu 100% aus der Ich-Perspektive von ${playerAddress} („Ich“, „Mein“, „Mir“).
2. Du schreibst NIEMALS Handlungen, Dialoge, Gedanken oder Entscheidungen für die andere Figur.
3. Der Entwurf darf ${playerAddress}s eigene Handlungen, Bewegungen, Reaktionen, Gedanken (in *kursiv*), Gefühle, körperliche Empfindungen und Dialoge enthalten.
4. Reagiere auf die tatsächlich letzte Aktion der anderen Figur, ohne zusätzliche Vorgeschichte oder Beziehung zu erfinden.
5. Schweizer Rechtschreibung mit «ss» statt «ß».

${evidenceSections}

${pastExamplesSection}

=== AUSGABEFORMAT ===
Gib NUR den reinen literarischen Text des Entwurfs für ${playerAddress} aus. Keine Vorworte, Labels oder Erklärungen.`;
  }

  return `YOU ARE THE PERSONAL WRITING ASSISTANT FOR THE PLAYER CHARACTER "${playerAddress.toUpperCase()}".

YOUR ONLY TASK:
Generate the next turn EXCLUSIVELY from the 1st person perspective of ${playerAddress} as an editable draft.

=== STRICT ROLE & PERSPECTIVE SEPARATION ===
1. Write 100% in 1st person singular as ${playerAddress} ("I", "my", "me").
2. NEVER write actions, dialogue, thoughts, or decisions for the other character.
3. The draft may contain ${playerAddress}'s own actions, reactions, thoughts (in *italics*), feelings, sensations, and dialogue.
4. Respond to the other character's actual last action without inventing additional shared history or a relationship.
5. Write 100% in natural, expressive English.

${evidenceSections}

${pastExamplesSection}

=== OUTPUT FORMAT ===
Output ONLY the raw literary draft text for ${playerAddress}. No greetings, labels, or meta comments.`;
}

export function buildImitateUserPrompt(
  character: any,
  messages: any[],
  language: 'de' | 'en' = 'de',
  contextWindowSize: number = 10
): string {
  const playerAddress = character?.playerAddressName || 'Lidii';
  const recentMessages = (messages || []).slice(-contextWindowSize);
  const conversationHistoryText = recentMessages
    .map((m: any) => {
      const isPlayer = m.role === 'lidii' || m.role === 'user';
      const speaker = isPlayer ? `PLAYER (${playerAddress})` : 'CHARACTER';
      return `[${speaker}]:\n${m.content}`;
    })
    .join('\n\n');

  const lastCharMsg = [...recentMessages]
    .reverse()
    .find((m: any) => m.role !== 'lidii' && m.role !== 'user');

  let prompt = language === 'de'
    ? `Hier ist der jüngste tatsächliche Verlauf des Rollenspiels. Die Sprecherlabels sind technische Labels und kein Beweis dafür, welche Namen die Spielerfigur in-world kennt:\n\n${conversationHistoryText}\n\n`
    : `Here is the recent actual roleplay history. Speaker labels are technical labels and are not proof of which names the player character knows in-world:\n\n${conversationHistoryText}\n\n`;

  if (lastCharMsg) {
    prompt += language === 'de'
      ? `[LETZTE AKTION/WORTE DER ANDEREN FIGUR]:\n${lastCharMsg.content}\n\n`
      : `[OTHER CHARACTER'S LAST ACTION/WORDS]:\n${lastCharMsg.content}\n\n`;
  }

  prompt += language === 'de'
    ? `AUFGABE:\nVerfasse jetzt den nächsten Spielzug AUSSCHLIESSLICH aus der Ich-Perspektive von ${playerAddress}. Beschreibe nur ihre eigenen Handlungen, Gefühle, Gedanken (in *kursiv*) und Dialoge. Bewahre exakt den bereits belegten Beziehungs- und Wissensstand; erfinde keine frühere Bekanntschaft.`
    : `TASK:\nWrite the next turn EXCLUSIVELY in 1st person as ${playerAddress}. Describe only their own actions, thoughts (in *italics*), feelings, and dialogue. Preserve exactly the relationship and knowledge state already established; do not invent prior familiarity.`;

  return prompt;
}

// Helper: String sanitization for environment variables (removes zero-width chars, invisible unicode, extra whitespace)
function cleanEnvString(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/[\u2000-\u206F\uFEFF\u00A0\r\n\t]/g, '').trim();
}

// Helper: OpenRouter API config resolver
function getResolvedOpenRouterConfig(defaultModel: string, modelOverride?: string) {
  let envKey = cleanEnvString(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
  envKey = envKey.replace(/\s+/g, '');

  let envBaseUrl = cleanEnvString(process.env.OPENROUTER_BASE_URL);
  if (envBaseUrl.startsWith('sk-') && !envKey.startsWith('sk-')) {
    envKey = envBaseUrl;
    envBaseUrl = 'https://openrouter.ai/api/v1';
  }

  let baseUrl = envBaseUrl;
  if (!baseUrl || (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://'))) {
    baseUrl = 'https://openrouter.ai/api/v1';
  }
  baseUrl = baseUrl.replace(/\/+$/, '');
  baseUrl = baseUrl.replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');

  const requestUrl = baseUrl.endsWith('/api/v1') || baseUrl.endsWith('/v1')
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/api/v1/chat/completions`;

  let finalModel = cleanEnvString(modelOverride || process.env.OPENROUTER_MODEL);
  if (
    !finalModel ||
    finalModel.startsWith('http') ||
    finalModel.startsWith('sk-') ||
    finalModel === 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
  ) {
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

  if (!config.apiKey) throw new Error('OPENROUTER_API_KEY ist auf dem Server nicht konfiguriert.');

  const requestBody = {
    model: config.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
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

  const contentType = response.headers?.get('content-type') || '';
  const isHtml = rawText.trim().startsWith('<') || (contentType.includes('text/html') && !contentType.includes('json'));
  if (isHtml) {
    throw new Error(`OpenRouter antwortete mit HTTP ${response.status} ${response.statusText} (HTML-Antwort erhalten von ${config.requestUrl}). Bitte prüfe Verbindung und Endpunkt.`);
  }

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

    if (
      errMsgStr.includes('overload') || errMsgStr.includes('503') || errMsgStr.includes('rate limit') ||
      errMsgStr.includes('temporarily') || errMsgStr.includes('unavailable') || errMsgStr.includes('busy')
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
      if (response.status === 401) throw new Error(`OpenRouter Authentifizierungsfehler (HTTP 401): ${errMsgStr}. Bitte prüfe deinen OPENROUTER_API_KEY.`);
      if (response.status === 402) throw new Error(`OpenRouter Guthaben/Limit-Fehler (HTTP 402): ${errMsgStr}`);
      throw new Error(`OpenRouter API Fehler (HTTP ${response.status}): ${errMsgStr}`);
    }
  }

  return { text: cleanRoleplayOutput(text), modelUsed, latencyMs: Date.now() - startTime };
}

// -------------------------------------------------------------
// ASYNC JOB ENDPOINTS (Persistent across page reloads/switches)
// -------------------------------------------------------------

app.post('/api/jobs/chat', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages-Array ist erforderlich.' });

    const jobId = `job-chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = { id: jobId, type: 'chat', characterId, chatId, status: 'running', createdAt: Date.now() };
    jobs.set(jobId, job);
    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const payload = buildChatPayload({ character, messages, storyContext, language, contextWindowSize: settings.contextWindowSize || 12 });
        const [systemMessage, ...messagesPayload] = payload.messages;
        const result = await generateOpenRouterResponse({
          systemPrompt: systemMessage.content,
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
        job.result = { content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: isDean ? 'dean' : 'character', speakerName: charName };
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

app.post('/api/jobs/start-chat', async (req: Request, res: Response) => {
  try {
    const { character, language = 'de', settings = {}, characterId, chatId, customPlot } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const jobId = `job-start-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = { id: jobId, type: 'start-chat', characterId, chatId, status: 'running', createdAt: Date.now() };
    jobs.set(jobId, job);
    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const payload = buildStartChatPayload({ character, language, storyContext: character?.storyContext, scenarioOverride: customPlot });
        const result = await generateOpenRouterResponse({
          systemPrompt: payload.messages[0].content,
          messages: [payload.openingMessage],
          temperature: settings.temperature ?? 0.9,
          maxTokens: 1100,
          defaultModel: CHAT_DEFAULT_MODEL,
          modelOverride: settings.modelName,
          timeoutMs: 50000,
        });
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = { content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: isDean ? 'dean' : 'character', speakerName: charName };
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

app.post('/api/jobs/imitate', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages-Array ist erforderlich.' });

    const jobId = `job-imitate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = { id: jobId, type: 'imitate', characterId, chatId, status: 'running', createdAt: Date.now() };
    jobs.set(jobId, job);
    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const playerAddress = character?.playerAddressName || 'Lidii';
        const playerMessages = messages
          .filter((m: any) => m.role === 'lidii' || m.role === 'user')
          .map((m: any) => m.content);
        const contextSize = settings.contextWindowSize || 10;
        const contextPayload = buildChatPayload({ character, messages, storyContext, language, contextWindowSize: contextSize });
        const activatedLore = contextPayload.activatedCharacterBookEntries.map(entry => entry.content).join('\n\n');
        const systemPrompt = buildImitateSystemPrompt(character, storyContext, playerMessages, language, activatedLore);
        const prompt = buildImitateUserPrompt(character, messages, language, contextSize);

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
        job.result = { draft: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: 'lidii', speakerName: playerAddress };
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

app.post('/api/jobs/photo', async (req: Request, res: Response) => {
  try {
    const { character, currentScene, language = 'de', characterId, chatId } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'Lidii';
    const isGerman = language === 'de';

    if (character?.imageFrequency === 'disabled') return res.status(400).json({ error: `Situative Bilder sind für ${charName} in den Profileinstellungen deaktiviert.` });

    const jobId = `job-photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: ServerJob = { id: jobId, type: 'photo', characterId, chatId, status: 'running', createdAt: Date.now() };
    jobs.set(jobId, job);
    res.json({ jobId, status: 'running' });

    (async () => {
      try {
        const imageStyle = character?.imageStyleDescription || (isDean ? 'Dunkel, atmosphärisch, schattig' : 'Passend zum Charakter');
        const systemPrompt = isGerman
          ? `Du bist die Figur ${charName.toUpperCase()}. Du schickst ${playerAddress} gerade ein situatives Bild oder Detail deiner aktuellen Umgebung bzw. deines Looks.\nSchreibe eine kurze, intensive Begleitnachricht (1-3 Sätze) im typischen Schreibstil von ${charName}. Schweizer Rechtschreibung mit «ss» statt «ß». Eigene Gedanken in *kursiv*.`
          : `You are ${charName.toUpperCase()}. You are sending ${playerAddress} a situational snapshot or detail of your current surroundings/appearance.\nWrite a short accompanying message (1-3 sentences) in ${charName}'s characteristic voice.`;
        const userPrompt = isGerman
          ? `Szene: ${currentScene || 'Ort der Handlung'}.\nAussehen: ${character?.appearance || 'Beschrieben gemäss Profil'}.\nStil / Fokus: ${imageStyle}.\nAufgabe: Schreibe die Begleitnachricht zu diesem situativen Moment.`
          : `Scene: ${currentScene || 'Current scene'}. Style: ${imageStyle}. Write the accompanying message for this moment.`;
        const result = await generateOpenRouterResponse({ systemPrompt, messages: [{ role: 'user', content: userPrompt }], temperature: 0.85, maxTokens: 350, defaultModel: CHAT_DEFAULT_MODEL, timeoutMs: 40000 });
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = { content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, role: isDean ? 'dean' : 'character', speakerName: charName };
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

app.get(['/api/jobs/:id', '/api/job/:id'], (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job nicht gefunden.' });
  res.json(job);
});

app.post('/api/start-chat', async (req: Request, res: Response) => {
  try {
    const { character, language = 'de', settings = {}, customPlot } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const payload = buildStartChatPayload({ character, language, storyContext: character?.storyContext, scenarioOverride: customPlot });
    const result = await generateOpenRouterResponse({ systemPrompt: payload.messages[0].content, messages: [payload.openingMessage], temperature: settings.temperature ?? 0.9, maxTokens: 1100, defaultModel: CHAT_DEFAULT_MODEL, modelOverride: settings.modelName, timeoutMs: 50000 });
    res.json({ role: isDean ? 'dean' : 'character', speakerName: charName, content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten der Szene.' });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {} } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const payload = buildChatPayload({ character, messages, storyContext, language, contextWindowSize: settings.contextWindowSize || 12 });
    const [systemMessage, ...messagesPayload] = payload.messages;
    const result = await generateOpenRouterResponse({ systemPrompt: systemMessage.content, messages: messagesPayload, temperature: settings.temperature ?? 0.88, maxTokens: settings.maxOutputTokens ? Math.min(settings.maxOutputTokens, 1800) : 1200, defaultModel: CHAT_DEFAULT_MODEL, modelOverride: settings.modelName, timeoutMs: 50000 });
    res.json({ role: isDean ? 'dean' : 'character', speakerName: charName, content: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Chat-Generierung.' });
  }
});

app.post('/api/imitate', async (req: Request, res: Response) => {
  try {
    const { character, messages, storyContext, language = 'de', settings = {} } = req.body;
    const playerAddress = character?.playerAddressName || 'Lidii';
    const playerMessages = (messages || [])
      .filter((m: any) => m.role === 'lidii' || m.role === 'user')
      .map((m: any) => m.content);
    const contextSize = settings.contextWindowSize || 10;
    const contextPayload = buildChatPayload({ character, messages: messages || [], storyContext, language, contextWindowSize: contextSize });
    const activatedLore = contextPayload.activatedCharacterBookEntries.map(entry => entry.content).join('\n\n');
    const systemPrompt = buildImitateSystemPrompt(character, storyContext, playerMessages, language, activatedLore);
    const prompt = buildImitateUserPrompt(character, messages || [], language, contextSize);
    const result = await generateOpenRouterResponse({ systemPrompt, messages: [{ role: 'user', content: prompt }], temperature: settings.temperature ?? 0.85, maxTokens: 850, defaultModel: IMITATE_DEFAULT_MODEL, modelOverride: settings.modelName, timeoutMs: 50000 });
    res.json({ draft: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs, speakerName: playerAddress });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Imitate-Entwurf.' });
  }
});

app.post('/api/summarize', async (req: Request, res: Response) => {
  try {
    const { character, messages, currentScene, keyEvents, language = 'de' } = req.body;
    const isDean = character?.id === 'char-dean' || character?.name?.trim().toLowerCase() === 'dean';
    const charName = character?.name || (isDean ? 'Dean' : 'Charakter');
    const playerAddress = character?.playerAddressName || 'Lidii';
    const isGerman = language === 'de';
    const prompt = isGerman
      ? `Fasse die jüngsten Ereignisse dieses Rollenspiels zwischen ${charName} und ${playerAddress} prägnant zusammen (1-2 Absätze). Verwende Schweizer Rechtschreibung mit «ss» statt «ß».\nOrt: ${currentScene || 'Nicht spezifiziert'}\nLetzte Nachrichten:\n${(messages || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`
      : `Summarize the recent events between ${charName} and ${playerAddress} concisely (1-2 paragraphs). Write in natural English.\nLocation: ${currentScene || 'Unspecified'}\nRecent messages:\n${(messages || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`;
    const result = await generateOpenRouterResponse({ systemPrompt: isGerman ? 'Du bist ein akribischer Kontext-Archivar.' : 'You are a meticulous scene and context archivist.', messages: [{ role: 'user', content: prompt }], temperature: 0.4, maxTokens: 600, defaultModel: SUMMARIZE_DEFAULT_MODEL, timeoutMs: 35000 });
    res.json({ summary: result.text, modelUsed: result.modelUsed, latencyMs: result.latencyMs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Zusammenfassung.' });
  }
});

app.post('/api/debug/inspect-prompt', (req: Request, res: Response) => {
  try {
    const { character, messages = [], storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    const payload = buildChatPayload({ character, messages, storyContext, language, contextWindowSize: settings.contextWindowSize || 12 });
    const currentUserMessage = [...payload.chatHistory].reverse().find(message => message.role === 'user');
    res.json({
      status: 'ok', characterId: characterId || character?.id, chatId, language,
      systemPrompt: payload.systemPrompt,
      characterDefinitions: payload.characterDefinitions,
      activatedCharacterBookEntries: payload.activatedCharacterBookEntries,
      chatHistory: payload.chatHistory, currentUserMessage,
      postHistoryInstructions: payload.postHistoryInstructions,
      finalMessages: payload.messages,
      breakdown: {
        systemPrompt: payload.systemPrompt,
        characterDefinition: payload.characterDefinitions,
        characterBookLore: payload.activatedCharacterBookEntries.map(entry => entry.content).join('\n\n'),
        chatHistoryCount: payload.chatHistory.length,
        postHistoryInstructions: payload.postHistoryInstructions,
        fullMessagesPayload: payload.messages,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler bei der Prompt-Inspektion.' });
  }
});

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

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Character RP Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') startServer();
