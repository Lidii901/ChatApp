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
}, 300000).unref();

// Character Card V2 prompt construction is shared by chat and diagnostics.
import { buildChatPayload, buildStartChatPayload } from './src/utils/promptBuilder';

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
        const payload = buildChatPayload({
          character, messages, storyContext, language, contextWindowSize: settings.contextWindowSize || 12,
        });
        const [systemMessage, ...messagesPayload] = payload.messages;
        const systemPrompt = systemMessage.content;

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
        const payload = buildStartChatPayload({
          character, language, storyContext: character?.storyContext,
          scenarioOverride: customPlot,
        });
        const systemPrompt = payload.messages[0].content;

        const result = await generateOpenRouterResponse({
          systemPrompt,
          messages: [payload.openingMessage],
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
    const payload = buildStartChatPayload({
      character, language, storyContext: character?.storyContext,
      scenarioOverride: customPlot,
    });
    const systemPrompt = payload.messages[0].content;

    const result = await generateOpenRouterResponse({
      systemPrompt,
      messages: [payload.openingMessage],
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
    const payload = buildChatPayload({
      character, messages, storyContext, language, contextWindowSize: settings.contextWindowSize || 12,
    });
    const [systemMessage, ...messagesPayload] = payload.messages;
    const systemPrompt = systemMessage.content;

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
    const { character, messages = [], storyContext, language = 'de', settings = {}, characterId, chatId } = req.body;
    const payload = buildChatPayload({
      character, messages, storyContext, language, contextWindowSize: settings.contextWindowSize || 12,
    });
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
        systemPrompt: payload.systemPrompt, characterDefinition: payload.characterDefinitions,
        characterBookLore: payload.activatedCharacterBookEntries.map(entry => entry.content).join('\n\n'),
        chatHistoryCount: payload.chatHistory.length, postHistoryInstructions: payload.postHistoryInstructions,
        fullMessagesPayload: payload.messages,
      },
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

if (process.env.NODE_ENV !== 'test') startServer();
