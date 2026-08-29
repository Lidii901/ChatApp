from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} not found')
    return text.replace(old, new, 1)

# --- App.tsx: use a dedicated greeting-localization endpoint instead of /api/chat ---
app_path = Path('src/App.tsx')
app = app_path.read_text()
pattern = re.compile(r"async function localizeGreetingForChat\(greeting: string, language: 'de' \| 'en'\): Promise<string> \{[\s\S]*?\n\}\n\nexport default function App\(\) \{")
replacement = '''async function localizeGreetingForChat(greeting: string, language: 'de' | 'en'): Promise<string> {
  if (!greeting.trim()) return '';

  const cacheKey = `${language}:${greeting}`;
  const cached = greetingLocalizationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const response = await fetch('/api/localize-greeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ greeting, language }),
  });

  const data = await response.json();
  if (!response.ok || data.error || !data.content) {
    throw new Error(data.error || 'Greeting localization failed.');
  }

  const localized = String(data.content).trim();
  greetingLocalizationCache.set(cacheKey, localized);
  return localized;
}

export default function App() {'''
app, count = pattern.subn(replacement, app, count=1)
if count != 1:
    raise SystemExit('App localizeGreetingForChat block not found exactly once')
app_path.write_text(app)

# --- server.ts: robust translation extraction + faster Imitate default ---
server_path = Path('server.ts')
server = server_path.read_text()
server = replace_once(
    server,
    "export const IMITATE_DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';",
    "export const IMITATE_DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';\nexport const IMITATE_FALLBACK_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';",
    'Imitate model constants',
)

insert_marker = 'async function generateCharacterReply(character: any, messages: any[], storyContext: any, language: \'de\' | \'en\', settings: any) {'
localization_code = r'''export function extractGreetingLocalizationOutput(raw: string): string {
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

'''
if insert_marker not in server:
    raise SystemExit('generateCharacterReply insertion marker not found')
server = server.replace(insert_marker, localization_code + insert_marker, 1)

old_imitate = '''  try {
    return await generateOpenRouterResponse({
      ...request,
      defaultModel: IMITATE_DEFAULT_MODEL,
      modelOverride: settings?.modelName,
      timeoutMs: 120000,
    });
  } catch (primaryError: any) {
    // Respect an explicit user model override. Automatic fallback only applies to
    // the built-in free Imitate model.
    if (String(settings?.modelName || '').trim()) throw primaryError;

    console.warn(
      `Imitate model ${IMITATE_DEFAULT_MODEL} failed (${primaryError?.message || primaryError}). ` +
      `Retrying with free chat model ${CHAT_DEFAULT_MODEL}...`
    );

    try {
      return await generateOpenRouterResponse({
        ...request,
        defaultModel: CHAT_DEFAULT_MODEL,
        timeoutMs: 120000,
      });
    } catch (fallbackError: any) {
      throw new Error(
        `Imitate Me konnte weder mit ${IMITATE_DEFAULT_MODEL} noch mit ${CHAT_DEFAULT_MODEL} einen Entwurf erzeugen. ` +
        `Letzter Fehler: ${fallbackError?.message || fallbackError}`
      );
    }
  }
}'''
new_imitate = '''  try {
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
}'''
server = replace_once(server, old_imitate, new_imitate, 'Imitate retry block')

config_marker = "app.get('/api/config', (_req: Request, res: Response) => {"
localize_endpoint = r'''app.post('/api/localize-greeting', async (req: Request, res: Response) => {
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

'''
if config_marker not in server:
    raise SystemExit('Config route marker not found')
server = server.replace(config_marker, localize_endpoint + config_marker, 1)
server_path.write_text(server)

# --- server regression assertions: analysis must never become a greeting ---
test_path = Path('tests/imitateKnowledge.test.ts')
test = test_path.read_text()
test = replace_once(
    test,
    "const { buildImitateSystemPrompt, buildImitateUserPrompt } = await import('../server');",
    "const { buildImitateSystemPrompt, buildImitateUserPrompt, extractGreetingLocalizationOutput } = await import('../server');",
    'server test import',
)
insert_test_marker = "console.log('Imitate Me knowledge-boundary regression assertions passed.');"
extra_tests = r'''assert.equal(
  extractGreetingLocalizationOutput('<greeting>The rain falls.\n\n*Quiet.*</greeting>'),
  'The rain falls.\n\n*Quiet.*'
);
assert.throws(
  () => extractGreetingLocalizationOutput('We need to translate the German greeting into English, preserving punctuation. Thus final English follows.'),
  /analysis instead of the translated greeting/i
);

'''
if insert_test_marker not in test:
    raise SystemExit('Imitate test insertion marker not found')
test = test.replace(insert_test_marker, extra_tests + insert_test_marker, 1)
test_path.write_text(test)

print('Patched dedicated greeting localization and faster default Imitate path')
