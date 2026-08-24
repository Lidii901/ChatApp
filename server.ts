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

// Helper: Build System Prompt for any Character
function buildCharacterSystemPrompt(
  character: any,
  storyContext: any,
  language: 'de' | 'en' = 'de'
): string {
  const charName = character?.name || 'Dean';
  const playerAddress = character?.playerAddressName || 'Lidii';
  const isGerman = language === 'de';

  const memories = Array.isArray(character?.memories)
    ? character.memories.map((m: any) => `- [${m.category || 'Erinnerung'}] ${m.content}`).join('\n')
    : '';

  const keyEvents = Array.isArray(storyContext?.keyEvents)
    ? storyContext.keyEvents.join('\n')
    : '';

  const nicknames = character?.nicknames ? character.nicknames.trim() : '';

  if (isGerman) {
    return `DU BIST DIE FIGUR „${charName.toUpperCase()}“.
Du bist der Hauptcharakter in einem privaten, hochklassigen literarischen Roleplay mit „${playerAddress}“.

=== CHARAKTERPROFIL: ${charName.toUpperCase()} ===
- Name: ${charName} (Kein Nachname, ausschliesslich „${charName}“)
- Alter: ${character?.age || '28'}
- Aussehen: ${character?.appearance || 'Markant, maskulin, dunkel und präsent.'}
- Persönlichkeit: ${character?.personality || 'Dominant, selbstbewusst, direkt, provokant, analytisch, ruhig unter Druck, flirty, eigeninitiativ.'}
- Hintergrund: ${character?.background || 'Hintergrundgeschichte gemäss Szenario.'}
- Beziehung zu ${playerAddress}: ${character?.relationshipToPlayer || `${playerAddress} ist das Gegenüber im RP.`}
- Standard-Anrede für den Spieler: Nenne die Spielerin standardmässig „${playerAddress}“.
${nicknames ? `- Spitznamen-Repertoire: ${nicknames} (Nutze diese Spitznamen dynamisch, passend zu deiner Dominanz, Stimmung, Situation und Intimität).` : ''}
- Schreibstil: ${character?.writingStyle || 'Atmosphärisch, sensorisch dicht, packend und voller körperlicher Präsenz.'}
- Tonfall: ${character?.toneOfVoice || 'Tief, rau, trocken, spöttisch, fordernd und kontrolliert.'}
- Typische Ausdrücke: ${character?.typicalPhrases || ''}
- Eigeninitiative: ${character?.initiativeLevel === 'high' ? 'Sehr hoch – Handele proaktiv, treibe die Situation voran, schneide Fluchtwege ab, verändere die Umgebung, nimm Raum ein.' : character?.initiativeLevel === 'low' ? 'Zurückhaltend.' : 'Ausgewogen.'}
- Dominanz / Haltung: ${character?.dominanceLevel === 'dominant' ? 'Dominant, fordernd, selbstbewusst und raumgreifend.' : character?.dominanceLevel === 'submissive' ? 'Unterwürfig / nachgiebig.' : 'Ausgewogen / kontrolliert.'}
- Flirt- und Beziehungsverhalten: ${character?.flirtBehavior === 'intense' ? 'Intensiv, knisternd, körperlich präsent, provokant und unverhohlen anziehend.' : 'Subtil.'}
${character?.behaviorRules ? `\n=== SPEZIFISCHE VERHALTENSREGELN ===\n${character.behaviorRules}` : ''}
${character?.customInstructions ? `\n=== ZUSÄTZLICHE KI-ANWEISUNGEN ===\n${character.customInstructions}` : ''}

=== STORY-KONTEXT & SZENE ===
Hintergrund:
${storyContext?.canonBackground || 'Laufende Geschichte.'}

Aktuelle Szene & Ort:
${storyContext?.currentScene || 'Ort der aktuellen Handlung.'}

Laufende Zusammenfassung:
${storyContext?.sceneSummary || 'Die Figuren befinden sich in direktem Kontakt.'}

Schlüsselereignisse:
${keyEvents || 'Keine spezifischen Ereignisse.'}

=== ERINNERUNGEN AN ${playerAddress.toUpperCase()} ===
${memories || 'Keine spezifischen Erinnerungen hinterlegt.'}

=== ESSENZIELLE ROLLENSPIEL- UND VERHALTENSREGELN ===
1. KLARE UNTERSCHEIDUNG VON INHALTEN:
   - Gesprochener Dialog: In Anführungszeichen („...“).
   - Eigene Gedanken von ${charName}: In *kursiver Schrift* (*...*).
   - Handlungen und Umwelt: Atmosphärische, sensorische Beschreibungen.
2. KEINE TELEPATHIE (LIDIIS GEDANKEN SIND DIR UNBEKANNT):
   - Wenn ${playerAddress} innere Monologe, Gedanken oder Zweifel beschreibt (z.B. „Ich zittere. Warum habe ich mich darauf eingelassen?“), weiss ${charName} davon NICHTS!
   - ${charName} reagiert ausschliesslich auf das, was er mit seinen Sinnen wahrnimmt: gesprochene Worte, sichtbare Bewegungen, Zittern, Atmung, Blickkontakt, Zögern oder Schweigen.
3. PROAKTIVE EIGENINITIATIVE & SZENENFÜHRUNG:
   - ${charName} wartet NICHT passiv auf die nächste Reaktion von ${playerAddress}. Er treibt den Plot selbstständig voran.
   - Wenn ${playerAddress} nichts sagt, nur zögert oder keine direkte Aktion ausführt, ergreift ${charName} selbst die Initiative (verändert die Position, greift zu, spricht sie an, bringt neue Dynamik in den Raum).
   - Das Rollenspiel soll sich wie eine flüssige, lebendige Szene anfühlen und NICHT wie ein Frage-Antwort-Interview.
4. KEINE OFFENEN META-FRAGEN:
   - Beende deine Antworten NIEMALS mit offenen, passiven Fragen wie „Was machst du?“ oder „Wie reagierst du?“.
   - Schliesse mit einer klaren Handlung, einer fordernden Geste oder einem pointierten Dialog ab.
5. KEIN GODMODING:
   - Bestimme NIEMALS ${playerAddress}s Handlungen, innere Gefühle oder Entscheidungen als gesicherte Tatsache. ${playerAddress} bleibt unter voller Kontrolle der Spielerin.
6. SCHREIBWEISE:
   - Verwende Schweizer Rechtschreibung mit «ss» statt «ß» (niemals «ß» verwenden, immer «ss»: z.B. «gross», «schliessen», «muss», «Strasse»).`;
  } else {
    return `YOU ARE THE CHARACTER "${charName.toUpperCase()}".
You are the primary character in a private, high-quality literary roleplay with "${playerAddress}".

=== CHARACTER PROFILE: ${charName.toUpperCase()} ===
- Name: ${charName} (Strictly "${charName}", no surname)
- Age: ${character?.age || '28'}
- Appearance: ${character?.appearance || 'Striking, dark, muscular, commanding.'}
- Personality: ${character?.personality || 'Dominant, confident, direct, provocative, analytical, calm under pressure, flirty, proactive.'}
- Relationship to ${playerAddress}: Address her strictly as "${playerAddress}" or using dynamic nicknames (${nicknames || 'none specified'}).
- Writing Style: ${character?.writingStyle || 'Atmospheric, sensory-rich, captivating.'}
- Tone of Voice: ${character?.toneOfVoice || 'Deep, dry, commanding, provocative.'}
- Initiative: High – Act proactively, drive the scene forward, do not wait passively.
- Dominance: Dominant, unapologetic, confident.
${character?.behaviorRules ? `\n=== BEHAVIOR RULES ===\n${character.behaviorRules}` : ''}
${character?.customInstructions ? `\n=== CUSTOM INSTRUCTIONS ===\n${character.customInstructions}` : ''}

=== STORY CONTEXT ===
Background: ${storyContext?.canonBackground || ''}
Current Scene: ${storyContext?.currentScene || ''}
Summary: ${storyContext?.sceneSummary || ''}
Key Events: ${keyEvents || ''}

=== ACTIVE MEMORIES ===
${memories || ''}

=== CRITICAL ROLEPLAY RULES ===
1. CLEAR DISTINCTION:
   - Spoken dialogue in quotes ("...").
   - ${charName}'s internal thoughts in *italics* (*...*).
   - Physical actions and sensory environment descriptions.
2. NO TELEPATHY (${playerAddress.toUpperCase()}'S THOUGHTS ARE UNKNOWN TO YOU):
   - You only know what ${charName} perceives with his senses (speech, physical motion, trembling, breathing, silence). You NEVER know her internal monologues.
3. PROACTIVE ACTION:
   - Never wait passively. If ${playerAddress} is silent or hesitant, advance the scene yourself.
4. NO META QUESTIONS:
   - Never end your turns with questions like "What do you do?". End with an action or statement.
5. NO GODMODING:
   - Never decide ${playerAddress}'s thoughts or actions.`;
  }
}

// Helper: Build System Prompt for "Imitate Me" (Player / Lidii candidate draft)
function buildImitateSystemPrompt(
  character: any,
  storyContext: any,
  userPastMessages: string[],
  language: 'de' | 'en' = 'de'
): string {
  const charName = character?.name || 'Dean';
  const playerAddress = character?.playerAddressName || 'Lidii';
  const isGerman = language === 'de';

  const pastExamplesSection = userPastMessages && userPastMessages.length > 0
    ? `=== BISHERIGE BEISPIELE VON ${playerAddress.toUpperCase()}S SCHREIBSTIL ===\n${userPastMessages.slice(-5).map((msg, i) => `[Beispiel ${i + 1}]:\n${msg.trim()}`).join('\n\n')}`
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
5. Write in natural, expressive English.

${pastExamplesSection}

=== OUTPUT FORMAT ===
Output ONLY the raw literary draft text for ${playerAddress}. No greetings or meta comments.`;
  }
}

// Helper: OpenRouter API config resolver
function getResolvedOpenRouterConfig(defaultModel: string, modelOverride?: string) {
  let envKey = (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  let envBaseUrl = (process.env.OPENROUTER_BASE_URL || '').trim();

  if (envBaseUrl.startsWith('sk-') && !envKey.startsWith('sk-')) {
    envKey = envBaseUrl;
    envBaseUrl = 'https://openrouter.ai/api/v1';
  }

  const baseUrl = (envBaseUrl.startsWith('http://') || envBaseUrl.startsWith('https://'))
    ? envBaseUrl
    : 'https://openrouter.ai/api/v1';

  const normalizedBase = baseUrl.replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
  const requestUrl = normalizedBase.endsWith('/api/v1')
    ? `${normalizedBase}/chat/completions`
    : `${normalizedBase}/api/v1/chat/completions`;

  let finalModel = modelOverride?.trim() || (process.env.OPENROUTER_MODEL || '').trim();
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
    baseUrl: normalizedBase,
    requestUrl,
    model: finalModel,
  };
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

  let text = '';
  let modelUsed = config.model;

  try {
    const rawData = await response.json();
    if (rawData.choices?.[0]?.message?.content) {
      const c = rawData.choices[0].message.content;
      text = Array.isArray(c) ? c.map((p: any) => (typeof p === 'string' ? p : p?.text || '')).join('') : String(c);
      modelUsed = rawData.model || config.model;
    } else if (rawData.choices?.[0]?.message?.refusal) {
      text = rawData.choices[0].message.refusal;
      modelUsed = rawData.model || config.model;
    } else if (rawData.error) {
      const errMsg = rawData.error.message || JSON.stringify(rawData.error);
      if (errMsg.includes('overload') || errMsg.includes('503') || errMsg.includes('rate limit') || errMsg.includes('temporarily') || errMsg.includes('unavailable')) {
        console.warn(`Upstream model ${config.model} busy. Retrying with fallback ${FALLBACK_FREE_MODEL}...`);
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
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const fc = fallbackData.choices?.[0]?.message?.content;
          if (fc) {
            text = Array.isArray(fc) ? fc.map((p: any) => (typeof p === 'string' ? p : p?.text || '')).join('') : String(fc);
            modelUsed = fallbackData.model || FALLBACK_FREE_MODEL;
          }
        }
      }
      if (!text) {
        throw new Error(`OpenRouter API Fehler: ${errMsg}`);
      }
    }
  } catch (err: any) {
    if (!text) {
      throw new Error(`Fehler bei OpenRouter-Antwort: ${err.message}`);
    }
  }

  // Ensure Swiss German "ss" instead of "ß"
  let sanitizedText = text.trim();
  if (sanitizedText.includes('ß')) {
    sanitizedText = sanitizedText.replace(/ß/g, 'ss');
  }

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

        const formattedMessages = recentMessages.map((m: any) => {
          let contentStr = m.content;
          if (m.image?.url && (m.role === 'lidii' || m.role === 'user')) {
            contentStr = `[Lidii hat ein Bild/Foto angehängt${m.image.caption ? `: ${m.image.caption}` : ''}]\n${contentStr}`;
          }
          return {
            role: (m.role === 'lidii' || m.role === 'user') ? ('user' as const) : ('assistant' as const),
            content: contentStr,
          };
        });

        const result = await generateOpenRouterResponse({
          systemPrompt,
          messages: formattedMessages,
          temperature: settings.temperature ?? 0.88,
          maxTokens: settings.maxOutputTokens ? Math.min(settings.maxOutputTokens, 1800) : 1200,
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
          role: character?.id === 'char-dean' ? 'dean' : 'character',
          speakerName: character?.name || 'Dean',
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
    const charName = character?.name || 'Dean';
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
          ? `AUFGABE FÜR DEN SZENENSTART:\nBeginne dieses neue Rollenspiel mit einem atmosphärischen, packenden ersten Spielzug aus der Sicht von ${charName.toUpperCase()}.\n\nSZENARIO / STARTPLOT:\n${startPlot}\n\nSTARTVERHALTEN:\n${startBehavior}\n\nREGELN:\n- Schreibe in der Ich-Perspektive von ${charName}.\n- Beschreibe die Umgebung, die körperliche Präsenz, eigene Gedanken in *kursiv* und gesprochene Worte in Anführungszeichen („...“).\n- Sprich ${playerAddress} direkt an oder stelle sie im Raum.\n- Bestimme NICHT die Handlungen oder Gefühle von ${playerAddress}.\n- Schweizer Rechtschreibung mit «ss» statt «ß».`
          : `TASK FOR OPENING SCENE:\nBegin this roleplay with an atmospheric opening turn from the perspective of ${charName.toUpperCase()}.\n\nSCENARIO / START PLOT:\n${startPlot}\n\nSTART BEHAVIOR:\n${startBehavior}\n\nRULES:\n- Write in 1st person as ${charName}.\n- Describe setting, physical presence, thoughts in *italics* and spoken dialogue in quotes ("...").\n- Address ${playerAddress} directly.\n- Do not dictate actions for ${playerAddress}.`;

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
          role: character?.id === 'char-dean' ? 'dean' : 'character',
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
        const playerAddress = character?.playerAddressName || 'Lidii';
        const lidiiMessages = messages
          .filter((m: any) => m.role === 'lidii' || m.role === 'user')
          .map((m: any) => m.content);

        const systemPrompt = buildImitateSystemPrompt(character, storyContext, lidiiMessages, language);
        const contextSize = settings.contextWindowSize || 10;
        const recentMessages = messages.slice(-contextSize);

        const charName = character?.name || 'Dean';
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

// 4. Create Photo Generation Job (Character sends photo / selfie)
app.post('/api/jobs/photo', async (req: Request, res: Response) => {
  try {
    const { character, currentScene, language = 'de', characterId, chatId } = req.body;
    const charName = character?.name || 'Dean';
    const playerAddress = character?.playerAddressName || 'Lidii';
    const isGerman = language === 'de';

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
        const systemPrompt = isGerman
          ? `Du bist die Figur ${charName.toUpperCase()}. Du schickst ${playerAddress} gerade ein situatives Foto (z.B. Spiegel-Selfie, Detailaufnahme, Ausblick, Outfit).
Schreibe eine kurze, intensive Begleitnachricht (1-2 Sätze) im typischen Schreibstil von ${charName}. Schweizer Rechtschreibung mit «ss» statt «ß». Eigene Gedanken in *kursiv*.`
          : `You are ${charName.toUpperCase()}. You are sending a situational photo/selfie to ${playerAddress}.
Write a short accompanying message (1-2 sentences) in ${charName}'s characteristic voice.`;

        const userPrompt = isGerman
          ? `Szene: ${currentScene || 'Dunkle Bronx-Gasse / Duplex'}.
Aussehen: ${character?.appearance || 'Schwarze Kleidung, Ghost-Schädelmaske, muskulös'}.
Bildstil: ${character?.imageStyleDescription || 'Atmosphärisch, dunkel, realistisch'}.
Aufgabe: Schreibe die kurze Nachricht zum Foto.`
          : `Scene: ${currentScene || 'Dark atmosphere'}. Write the accompanying message for the photo.`;

        const result = await generateOpenRouterResponse({
          systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.85,
          maxTokens: 300,
          defaultModel: CHAT_DEFAULT_MODEL,
          timeoutMs: 40000,
        });

        const photoUrl = character?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';

        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = {
          content: result.text,
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          role: character?.id === 'char-dean' ? 'dean' : 'character',
          speakerName: charName,
          image: {
            url: photoUrl,
            caption: `${charName} – Fotoaufnahme`,
            prompt: character?.imageStyleDescription || `${charName} in der aktuellen Szene`,
          },
        };
      } catch (genError: any) {
        console.error('Job error (photo):', genError);
        job.status = 'failed';
        job.error = genError.message || 'Fehler beim Generieren des Charakter-Fotos.';
        job.completedAt = Date.now();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fehler beim Starten des Photo-Jobs.' });
  }
});

// 5. Get Job Status
app.get('/api/jobs/:id', (req: Request, res: Response) => {
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
    const charName = character?.name || 'Dean';
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
      ? `AUFGABE FÜR DEN SZENENSTART:\nBeginne dieses neue Rollenspiel mit einem atmosphärischen, packenden ersten Spielzug aus der Sicht von ${charName.toUpperCase()}.\n\nSZENARIO / STARTPLOT:\n${startPlot}\n\nSTARTVERHALTEN:\n${startBehavior}\n\nREGELN:\n- Schreibe in der Ich-Perspektive von ${charName}.\n- Beschreibe die Umgebung, die körperliche Präsenz, eigene Gedanken in *kursiv* und gesprochene Worte in Anführungszeichen („...“).\n- Sprich ${playerAddress} direkt an oder stelle sie im Raum.\n- Bestimme NICHT die Handlungen oder Gefühle von ${playerAddress}.\n- Schweizer Rechtschreibung mit «ss» statt «ß».`
      : `TASK FOR OPENING SCENE:\nBegin this roleplay with an atmospheric opening turn from the perspective of ${charName.toUpperCase()}.\n\nSCENARIO / START PLOT:\n${startPlot}\n\nSTART BEHAVIOR:\n${startBehavior}\n\nRULES:\n- Write in 1st person as ${charName}.\n- Describe setting, physical presence, thoughts in *italics* and spoken dialogue in quotes ("...").\n- Address ${playerAddress} directly.\n- Do not dictate actions for ${playerAddress}.`;

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
      role: character?.id === 'char-dean' ? 'dean' : 'character',
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
    const systemPrompt = buildCharacterSystemPrompt(character, storyContext, language);
    const contextSize = settings.contextWindowSize || 12;
    const recentMessages = messages.slice(-contextSize);

    const formattedMessages = recentMessages.map((m: any) => {
      let contentStr = m.content;
      if (m.image?.url && (m.role === 'lidii' || m.role === 'user')) {
        contentStr = `[Lidii hat ein Bild/Foto angehängt${m.image.caption ? `: ${m.image.caption}` : ''}]\n${contentStr}`;
      }
      return {
        role: (m.role === 'lidii' || m.role === 'user') ? ('user' as const) : ('assistant' as const),
        content: contentStr,
      };
    });

    const result = await generateOpenRouterResponse({
      systemPrompt,
      messages: formattedMessages,
      temperature: settings.temperature ?? 0.88,
      maxTokens: settings.maxOutputTokens ? Math.min(settings.maxOutputTokens, 1800) : 1200,
      defaultModel: CHAT_DEFAULT_MODEL,
      modelOverride: settings.modelName,
      timeoutMs: 50000,
    });

    res.json({
      role: character?.id === 'char-dean' ? 'dean' : 'character',
      speakerName: character?.name || 'Dean',
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
    const playerAddress = character?.playerAddressName || 'Lidii';
    const lidiiMessages = (messages || [])
      .filter((m: any) => m.role === 'lidii' || m.role === 'user')
      .map((m: any) => m.content);

    const systemPrompt = buildImitateSystemPrompt(character, storyContext, lidiiMessages, language);
    const contextSize = settings.contextWindowSize || 10;
    const recentMessages = (messages || []).slice(-contextSize);
    const charName = character?.name || 'Dean';

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
    const charName = character?.name || 'Dean';
    const playerAddress = character?.playerAddressName || 'Lidii';

    const prompt = language === 'de'
      ? `Fasse die jüngsten Ereignisse dieses Rollenspiels zwischen ${charName} und ${playerAddress} prägnant zusammen (1-2 Absätze). Verwende Schweizer Rechtschreibung mit «ss» statt «ß».
Ort: ${currentScene || 'Nicht spezifiziert'}
Letzte Nachrichten:\n${(messages || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`
      : `Summarize the recent events between ${charName} and ${playerAddress} concisely (1-2 paragraphs).
Location: ${currentScene || 'Unspecified'}
Recent messages:\n${(messages || []).slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`;

    const result = await generateOpenRouterResponse({
      systemPrompt: 'Du bist ein akribischer Kontext-Archivar.',
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
