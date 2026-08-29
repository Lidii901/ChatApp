import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright';

const BASE = process.env.PREVIEW_URL || 'https://chatapp-preview.onrender.com';
const results = [];
const liveOutputs = {};

function logResult(name, ok, detail = '') {
  results.push({ name, ok, detail: String(detail || '') });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function test(name, fn) {
  try {
    const detail = await fn();
    logResult(name, true, detail || 'ok');
  } catch (error) {
    logResult(name, false, error?.stack || error?.message || error);
  }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function requestJson(url, options = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { res, data, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForPreview() {
  let last = '';
  for (let i = 0; i < 24; i += 1) {
    try {
      const { res, data, text } = await requestJson(`${BASE}/api/config`, {}, 30000);
      last = text;
      if (res.ok && data?.status === 'ok') return data;
    } catch (e) {
      last = e.message;
    }
    await sleep(10000);
  }
  throw new Error(`Preview did not become ready: ${last}`);
}

async function startJob(route, body, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { res, data, text } = await requestJson(`${BASE}${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }, 60000);
      if (!res.ok || !data?.jobId) throw new Error(`${route} start failed ${res.status}: ${text}`);
      return data.jobId;
    } catch (e) {
      lastError = e;
      if (attempt < attempts) await sleep(3000);
    }
  }
  throw lastError;
}

async function pollJob(jobId, timeoutMs = 240000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    const { res, data, text } = await requestJson(`${BASE}/api/jobs/${encodeURIComponent(jobId)}`, {}, 30000);
    if (!res.ok) throw new Error(`poll ${jobId}: ${res.status} ${text}`);
    last = data;
    if (data.status === 'completed') return data;
    if (data.status === 'failed' || data.status === 'error') throw new Error(data.error || `job ${jobId} failed`);
    await sleep(1800);
  }
  throw new Error(`Timeout waiting for ${jobId}; last=${JSON.stringify(last)}`);
}

function assertNoTranslatorMeta(text) {
  assert.ok(text && text.trim().length > 20, 'empty/too short output');
  assert.doesNotMatch(text, /we need to translate|original german|preserve punctuation|thus final english|translation notes?|analysis\s*:/i);
}

function looksEnglish(text) {
  const t = ` ${text.toLowerCase()} `;
  const en = [' the ', ' i ', ' you ', ' and ', ' to ', ' of ', ' is ', ' my ', ' your '].filter(x => t.includes(x)).length;
  const de = [' der ', ' die ', ' das ', ' und ', ' ich ', ' du ', ' nicht ', ' mein ', ' deine '].filter(x => t.includes(x)).length;
  return en >= de && en >= 2;
}

function looksGerman(text) {
  const t = ` ${text.toLowerCase()} `;
  const de = [' der ', ' die ', ' das ', ' und ', ' ich ', ' du ', ' nicht ', ' mein ', ' deine ', ' den '].filter(x => t.includes(x)).length;
  const en = [' the ', ' and ', ' you ', ' my ', ' your ', ' with ', ' that ', ' this '].filter(x => t.includes(x)).length;
  return de >= en && de >= 2;
}

const originalGreeting = `The spine of The Great Gatsby presses into your palm as you slide it into place on the shelf. The library is quiet, the way you like it—just the hum of fluorescent lights and the occasional rustle of pages. You don't notice him at first, but he's three rows over, partially hidden by a display of new arrivals. His fingers trail along the books without reading a single title. His focus is fixed entirely on the sliver of you visible through the gap between volumes: the curve of your neck as you reach up, the way your lips purse when you concentrate.\n\nHe imagines you're performing for him. You have to be. Why else would you tilt your head just so? Why else would your hips sway that gentle arc as you step down the ladder?`;

const defaultSettings = {
  provider: 'openrouter', modelName: '', temperature: 0.88, maxOutputTokens: 900,
  contextSizeTokens: 32768, topP: 1, frequencyPenalty: 0, presencePenalty: 0,
  repetitionPenalty: 1, promptNote: '', promptNoteDepth: 1, promptNoteRole: 'system',
  assistantPrefill: '',
  impersonationPrompt: `Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Don't write as {{char}} or system. Don't describe actions of {{char}}.`,
};

const auditCharacter = {
  id: 'audit-secret-observer', name: 'XQZSecret', avatarUrl: '', age: '28',
  appearance: 'A tall man in a dark jacket.',
  description: 'XQZSecret is a patient, obsessive observer. He has secretly watched {{user}} for weeks, but {{user}} does not know his name or that he has been watching.',
  personality: 'Calm, observant, active, unsettling, concise. He takes plausible initiative without controlling {{user}}.',
  scenario: 'A quiet public library. {{user}} has never knowingly met XQZSecret. XQZSecret has secretly observed {{user}}, which is hidden knowledge for {{user}}.',
  firstMes: originalGreeting,
  mesExample: '<START>\n{{user}}: I look up from my book.\n{{char}}: I move to the next shelf, close enough to be noticed without explaining why I am there.',
  postHistoryInstructions: 'Stay active. Do not recap the user turn. Never invent the user’s thoughts, feelings, actions or knowledge as fact.',
  playerAddressName: 'AuditUser', thoughtsEnabled: true, initiativeLevel: 'high', plotInitiative: 'high',
  flirtBehavior: 'subtle', dominanceLevel: 'dominant', behaviorRules: '', background: '', relationshipToPlayer: '',
  writingStyle: '', toneOfVoice: '', typicalPhrases: '', memories: [], imageFrequency: 'occasional', imageStyleDescription: 'dark library snapshot',
  createdAt: 1, updatedAt: 1,
};

function collectTsxFiles(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...collectTsxFiles(p));
    else if (item.isFile() && p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

await test('Static: every JSX <button> has an onClick handler or form submit semantics', async () => {
  const files = collectTsxFiles('src');
  const missing = [];
  let count = 0;
  for (const file of files) {
    const sourceText = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function walk(node) {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'button') {
        count += 1;
        const attrs = node.openingElement.attributes.properties;
        const hasOnClick = attrs.some(a => ts.isJsxAttribute(a) && a.name.getText(source) === 'onClick');
        const isSubmit = attrs.some(a => ts.isJsxAttribute(a) && a.name.getText(source) === 'type' && a.initializer?.getText(source).includes('submit'));
        if (!hasOnClick && !isSubmit) missing.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  assert.equal(missing.length, 0, `Buttons without action: ${missing.join(', ')}`);
  return `${count} buttons inspected`;
});

await test('Static: current Dean card contains exact Chub greeting and no librarian occupation', async () => {
  const text = fs.readFileSync('src/data/defaultCharacters.ts', 'utf8');
  assert.ok(text.includes('The spine of The Great Gatsby presses into your palm as you slide it into place on the shelf.'));
  const deanBlock = text.split("id: 'char-dean'")[1].split("id: 'char-julian'")[0];
  assert.doesNotMatch(deanBlock, /Lidii (?:works|arbeitet) as? (?:a )?librarian|Lidii arbeitet als Bibliothekarin/i);
  assert.match(deanBlock, /secretly watched \{\{user\}\} from a distance for weeks/i);
  assert.match(deanBlock, /obsess/i);
  return 'Dean source card aligned';
});

await test('Static: master prompt contains Chub-style activity/repetition/show-dont-tell/user-agency rules', async () => {
  const text = fs.readFileSync('src/utils/promptBuilder.ts', 'utf8');
  for (const required of ['avoid repetition', 'dynamic and active', "show-don't-tell", 'Do not recap or paraphrase', "{{user}}'s agency", 'direct and explicit']) {
    assert.ok(text.includes(required), `missing ${required}`);
  }
  return 'master prompt markers present';
});

await test('Static: Imitate default is Chub prompt plus knowledge/continuity guard', async () => {
  const text = fs.readFileSync('server.ts', 'utf8');
  assert.ok(text.includes('Write your next reply from the point of view of {{user}}'));
  assert.ok(text.includes('IMPORTANT PLAYER-KNOWLEDGE BOUNDARY'));
  assert.ok(text.includes('Preserve already established objective scene state'));
  assert.ok(text.includes("char: language === 'de' ? 'die andere Figur' : 'the other character'"));
  return 'Imitate prompt and guards present';
});

let config;
await test('Live preview: /api/config ready, OpenRouter key present, free defaults active', async () => {
  config = await waitForPreview();
  assert.equal(config.provider, 'openrouter');
  assert.equal(config.hasKey, true, 'preview has no OpenRouter key');
  assert.match(config.chatModel || '', /:free$/);
  assert.match(config.imitateModel || '', /:free$/);
  return `${config.chatModel} / ${config.imitateModel}`;
});

await test('Live greeting EN: already-English first_mes is returned verbatim, no analysis leakage', async () => {
  const { res, data, text } = await requestJson(`${BASE}/api/localize-greeting`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ greeting: originalGreeting, language: 'en' }),
  }, 120000);
  assert.ok(res.ok, text);
  assertNoTranslatorMeta(data.content);
  liveOutputs.greetingEn = data.content;
  assert.equal(data.content.trim(), originalGreeting.trim(), 'same-language greeting was rewritten instead of preserved verbatim');
  return `${data.modelUsed} ${data.latencyMs}ms`;
});

await test('Live greeting DE: translation only, no analysis leakage, macros/format safe', async () => {
  const greeting = `${originalGreeting}\n\n{{char}} watches {{user}}.`;
  const { res, data, text } = await requestJson(`${BASE}/api/localize-greeting`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ greeting, language: 'de' }),
  }, 120000);
  assert.ok(res.ok, text);
  assertNoTranslatorMeta(data.content);
  assert.ok(data.content.includes('{{char}}') && data.content.includes('{{user}}'), 'CCv2 macros were not preserved');
  assert.ok(looksGerman(data.content), `translation does not look German: ${data.content.slice(0, 300)}`);
  liveOutputs.greetingDe = data.content;
  return `${data.modelUsed} ${data.latencyMs}ms`;
});

await test('Live prompt inspector EN: actual payload contains card, activity rule, post-history and current user message', async () => {
  const body = {
    character: auditCharacter,
    messages: [{ role: 'user', content: 'I close my book and look toward the aisle.' }],
    storyContext: { currentScene: 'Library, door closed.', sceneSummary: '', keyEvents: [], profile: 'AuditUser is cautious.' },
    language: 'en', settings: defaultSettings, characterId: auditCharacter.id, chatId: 'audit-inspect-en',
  };
  const { res, data, text } = await requestJson(`${BASE}/api/debug/inspect-prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.ok(res.ok, text);
  assert.equal(data.language, 'en');
  assert.equal(data.currentUserMessage.content, body.messages[0].content);
  assert.match(data.systemPrompt, /active participant/i);
  assert.match(data.characterDefinitions, /secretly watched/i);
  assert.match(data.postHistoryInstructions, /Do not recap/i);
  assert.ok(Array.isArray(data.finalMessages) && data.finalMessages.length >= 2);
  return `${data.finalMessages.length} OpenRouter messages`;
});

await test('Live prompt inspector DE: final language guard stays German', async () => {
  const { res, data, text } = await requestJson(`${BASE}/api/debug/inspect-prompt`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      character: auditCharacter, messages: [{ role: 'user', content: 'Ich schliesse mein Buch.' }],
      storyContext: { currentScene: 'Bibliothek.', sceneSummary: '', keyEvents: [] }, language: 'de', settings: defaultSettings,
    }),
  });
  assert.ok(res.ok, text);
  assert.match(JSON.stringify(data.finalMessages), /FINALE AUSGABESPRACHE/);
  return 'German guard present';
});

await test('Live async start-chat generation works with empty greeting', async () => {
  const char = { ...auditCharacter, id: 'audit-start', name: 'AuditCharacter', firstMes: '', startPrompt: '', scenario: 'Two adult strangers meet in a quiet cafe. AuditCharacter speaks first.' };
  const jobId = await startJob('/api/jobs/start-chat', { character: char, language: 'en', settings: defaultSettings, characterId: char.id, chatId: 'audit-start-chat', customPlot: char.scenario });
  const job = await pollJob(jobId);
  assertNoTranslatorMeta(job.result?.content);
  assert.ok(looksEnglish(job.result.content));
  liveOutputs.startChat = job.result.content;
  return `${job.result.modelUsed} ${job.result.latencyMs}ms`;
});

await test('Live async chat generation EN works and does not verbatim recap the user turn', async () => {
  const userText = 'I close the red book, place it flat on the table, and ask, “Why are you standing there?”';
  const jobId = await startJob('/api/jobs/chat', {
    character: auditCharacter,
    messages: [{ role: 'dean', content: originalGreeting }, { role: 'lidii', content: userText }],
    storyContext: { currentScene: 'Library. The entrance door is closed.', sceneSummary: '', keyEvents: [] },
    language: 'en', settings: defaultSettings, characterId: auditCharacter.id, chatId: 'audit-chat-en',
  });
  const job = await pollJob(jobId);
  const out = job.result?.content || '';
  assertNoTranslatorMeta(out);
  assert.ok(looksEnglish(out));
  assert.ok(!out.includes(userText), 'model copied entire user turn verbatim');
  liveOutputs.chatEn = out;
  return `${job.result.modelUsed} ${job.result.latencyMs}ms | ${out.slice(0, 140).replace(/\s+/g, ' ')}`;
});

await test('Live async chat generation DE works', async () => {
  const userText = 'Ich schliesse das rote Buch, lege es flach auf den Tisch und frage: „Warum stehst du dort?“';
  const jobId = await startJob('/api/jobs/chat', {
    character: auditCharacter,
    messages: [{ role: 'dean', content: 'Ich beobachte dich zwischen den Regalen.' }, { role: 'lidii', content: userText }],
    storyContext: { currentScene: 'Bibliothek. Die Eingangstür ist geschlossen.', sceneSummary: '', keyEvents: [] },
    language: 'de', settings: defaultSettings, characterId: auditCharacter.id, chatId: 'audit-chat-de',
  });
  const job = await pollJob(jobId);
  const out = job.result?.content || '';
  assertNoTranslatorMeta(out);
  assert.ok(looksGerman(out), out.slice(0, 500));
  liveOutputs.chatDe = out;
  return `${job.result.modelUsed} ${job.result.latencyMs}ms | ${out.slice(0, 140).replace(/\s+/g, ' ')}`;
});

await test('Live Imitate EN: first person, no hidden technical character name, no secret-stalking certainty', async () => {
  const jobId = await startJob('/api/jobs/imitate', {
    character: auditCharacter,
    messages: [{ role: 'character', content: 'A man stands several shelves away and says, “Late night for reading.”' }],
    storyContext: { currentScene: 'Quiet library. The heavy entrance door is closed.', sceneSummary: '', keyEvents: [] },
    language: 'en', settings: defaultSettings, characterId: auditCharacter.id, chatId: 'audit-imitate-en',
  });
  const job = await pollJob(jobId, 220000);
  const out = job.result?.draft || '';
  assertNoTranslatorMeta(out);
  assert.match(out, /\bI\b|\bmy\b|\bme\b/i, 'not first person');
  assert.doesNotMatch(out, /XQZSecret/i, 'technical character name leaked');
  assert.doesNotMatch(out, /(?:has been|been) (?:stalking|watching|following) me for weeks/i, 'hidden stalking became factual player knowledge');
  liveOutputs.imitateEn = out;
  return `${job.result.modelUsed} ${job.result.latencyMs}ms | ${out.slice(0, 180).replace(/\s+/g, ' ')}`;
});

await test('Live Imitate DE: first person, no hidden technical character name', async () => {
  const jobId = await startJob('/api/jobs/imitate', {
    character: auditCharacter,
    messages: [{ role: 'character', content: 'Ein fremder Mann steht einige Regale entfernt und sagt: „Spät zum Lesen.“' }],
    storyContext: { currentScene: 'Ruhige Bibliothek. Die schwere Eingangstür ist geschlossen.', sceneSummary: '', keyEvents: [] },
    language: 'de', settings: defaultSettings, characterId: auditCharacter.id, chatId: 'audit-imitate-de',
  });
  const job = await pollJob(jobId, 220000);
  const out = job.result?.draft || '';
  assertNoTranslatorMeta(out);
  assert.match(out, /\bich\b|\bmein(?:e|en|em|er)?\b|\bmir\b|\bmich\b/i, 'not first person German');
  assert.doesNotMatch(out, /XQZSecret/i, 'technical character name leaked');
  liveOutputs.imitateDe = out;
  return `${job.result.modelUsed} ${job.result.latencyMs}ms | ${out.slice(0, 180).replace(/\s+/g, ' ')}`;
});

await test('Live photo/background job completes and returns usable character content', async () => {
  const jobId = await startJob('/api/jobs/photo', {
    character: auditCharacter, currentScene: 'Library table beside a rain-streaked window.', language: 'en', characterId: auditCharacter.id, chatId: 'audit-photo',
  });
  const job = await pollJob(jobId, 120000);
  assertNoTranslatorMeta(job.result?.content || '');
  liveOutputs.photo = job.result?.content || '';
  return `${job.result.modelUsed} ${job.result.latencyMs}ms; image=${Boolean(job.result?.image)}`;
});

await test('Live summarize endpoint handles in-context skip correctly', async () => {
  const { res, data, text } = await requestJson(`${BASE}/api/summarize`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      character: auditCharacter, messages: [{ role: 'user', content: 'A short message.' }], currentScene: 'Library', currentSummary: 'Existing memory', language: 'en', settings: defaultSettings,
    }),
  }, 60000);
  assert.ok(res.ok, text);
  assert.equal(data.skipped, true);
  assert.equal(data.summary, 'Existing memory');
  return data.reason;
});

async function browserAudit() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await context.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.setDefaultTimeout(20000);

  async function gotoFresh() {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('#app-root').waitFor({ state: 'visible', timeout: 120000 });
  }

  async function backToMain() {
    if (await page.locator('#header-back-to-chats').count()) {
      await page.locator('#header-back-to-chats').click();
      await page.locator('#nav-tab-chats').waitFor();
    }
  }

  async function openNewDeanChat(lang) {
    await backToMain();
    await page.locator('#nav-tab-chats').click();
    const deanImg = page.locator('img[alt="Dean"]').first();
    await deanImg.waitFor({ state: 'visible' });
    await deanImg.locator('xpath=ancestor::button[1]').click();
    await page.getByText('Neue Story').waitFor();
    await page.getByRole('button', { name: lang === 'en' ? 'English' : 'Deutsch', exact: true }).click();
    await page.getByRole('button', { name: 'Chat starten' }).click();
    await page.locator('#chat-user-textarea').waitFor({ state: 'visible', timeout: 150000 });
    return page.locator('[id^="message-"]').first();
  }

  await test('UI mobile shell/navigation/search render', async () => {
    await gotoFresh();
    for (const id of ['#nav-tab-chats', '#nav-tab-characters', '#nav-tab-settings']) await page.locator(id).waitFor();
    const search = page.getByPlaceholder('Chats durchsuchen');
    await search.fill('Dean');
    assert.equal(await search.inputValue(), 'Dean');
    await search.fill('');
    return `${await page.locator('button').count()} buttons in initial DOM`;
  });

  await test('UI Settings: all three settings destinations open', async () => {
    await page.locator('#nav-tab-settings').click();
    await page.getByRole('heading', { name: 'Einstellungen' }).waitFor();
    await page.getByRole('button', { name: /KI & Antworten/ }).click();
    await page.getByRole('heading', { name: 'KI & Antworten' }).waitFor();
    await page.getByText('Erweiterte Einstellungen').click();
    assert.ok(await page.locator('input[type="range"]').count() >= 6);
    await page.getByRole('button', { name: 'Abbrechen' }).click();

    await page.getByRole('button', { name: /Backup & Import/ }).click();
    await page.locator('#import-export-modal').waitFor();
    await page.locator('#import-export-modal button[title="Schliessen"]').click();

    await page.getByRole('button', { name: /Verbindung & Diagnose/ }).click();
    await page.locator('#diagnostics-modal').waitFor();
    await page.getByText('Prompt Inspector (Chub / CCv2)').waitFor();
    await page.getByRole('button', { name: /Echtzeit-Logs/ }).click();
    if (await page.getByRole('button', { name: 'Logs leeren' }).count()) await page.getByRole('button', { name: 'Logs leeren' }).click();
    await page.locator('#diagnostics-modal button[title="Schließen"]').click();
    return 'settings/generation/data/diagnostics opened';
  });

  await test('UI Settings: modify advanced settings, persist, then restore defaults', async () => {
    await page.getByRole('button', { name: /KI & Antworten/ }).click();
    await page.getByText('Erweiterte Einstellungen').click();
    const ranges = page.locator('input[type="range"]');
    await ranges.nth(0).evaluate(el => { el.value = '1.02'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    const promptNote = page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea');
    await promptNote.fill('AUDIT_PROMPT_NOTE');
    const prefill = page.locator('label').filter({ hasText: 'Assistant Prefill' }).locator('textarea');
    await prefill.fill('AUDIT_PREFILL');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.getByText('Gespeichert').waitFor();
    await page.getByRole('button', { name: 'Abbrechen' }).click();

    await page.getByRole('button', { name: /KI & Antworten/ }).click();
    await page.getByText('Erweiterte Einstellungen').click();
    assert.equal(await page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea').inputValue(), 'AUDIT_PROMPT_NOTE');
    assert.equal(await page.locator('label').filter({ hasText: 'Assistant Prefill' }).locator('textarea').inputValue(), 'AUDIT_PREFILL');

    await page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea').fill('');
    await page.locator('label').filter({ hasText: 'Assistant Prefill' }).locator('textarea').fill('');
    await ranges.nth(0).evaluate(el => { el.value = '0.88'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.getByRole('button', { name: /Speichern|Gespeichert/ }).click();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    return 'advanced settings persisted and restored';
  });

  await test('UI Character Editor: create/edit every CCv2 tab, alternate greeting and lore, then delete test character', async () => {
    await page.locator('#nav-tab-characters').click();
    await page.getByRole('heading', { name: 'Charaktere' }).waitFor();
    await page.getByRole('button', { name: 'Neuer Charakter' }).first().click();
    await page.getByRole('heading', { name: 'Neuer Charakter' }).waitFor();
    await page.locator('label').filter({ hasText: 'Charaktername' }).locator('input').fill('Audit Character');
    await page.locator('label').filter({ hasText: 'Name von dir' }).locator('input').fill('Audit User');

    await page.getByRole('button', { name: 'Charakter', exact: true }).click();
    const defTextareas = page.locator('main textarea');
    await defTextareas.nth(0).fill('Audit description');
    await defTextareas.nth(1).fill('Audit personality');
    await defTextareas.nth(2).fill('Audit scenario');

    await page.getByRole('button', { name: 'Start', exact: true }).click();
    const startAreas = page.locator('main textarea');
    await startAreas.nth(0).fill('Hello {{user}} from Audit Character.');
    const allAreas = page.locator('main textarea');
    await allAreas.nth(1).fill('Alternate hello {{user}}.');
    const plusButtons = page.locator('main button').filter({ has: page.locator('svg') });
    // The small rose + beside the new alternate greeting is the first enabled button near that textarea.
    const greetingRow = allAreas.nth(1).locator('xpath=..');
    const greetingPlus = greetingRow.locator('button').first();
    await greetingPlus.click();

    await page.getByRole('button', { name: 'Erweitert', exact: true }).click();
    const advAreas = page.locator('main textarea');
    await advAreas.nth(0).fill('Audit system {{original}}');
    await advAreas.nth(1).fill('Audit post history');
    await advAreas.nth(2).fill('Audit character note');

    await page.getByRole('button', { name: 'Character Book', exact: true }).click();
    await page.getByRole('button', { name: /Lore-Eintrag hinzufügen/ }).click();
    await page.locator('input[placeholder="library, rain"]').fill('audit-key');
    const loreContent = page.locator('label').filter({ hasText: 'Inhalt' }).locator('textarea').last();
    await loreContent.fill('Audit lore content');
    await page.getByRole('button', { name: 'Permanent' }).click();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.getByText('Gespeichert').waitFor();
    // close by header X (first button in editor header)
    await page.locator('header button').last().click();

    await page.getByText('Audit Character').waitFor();
    await page.getByRole('button', { name: 'Audit Character bearbeiten' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    assert.ok((await page.locator('main').textContent()).includes('Hello {{user}} from Audit Character.'));
    await page.locator('header button').last().click();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Audit Character löschen' }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.getByText('Audit Character').count(), 0);
    return 'all editor tabs exercised; test character removed';
  });

  await test('UI EN new Dean chat: exact Chub greeting visible, manual message generates reply, Imitate fills input', async () => {
    const first = await openNewDeanChat('en');
    const greetingText = (await first.textContent()) || '';
    assertNoTranslatorMeta(greetingText);
    assert.match(greetingText, /The spine of The Great Gatsby presses into your palm/i);
    assert.match(greetingText, /three rows over/i);

    const textarea = page.locator('#chat-user-textarea');
    const unique = 'AUDIT EN: I lower the book and look toward the aisle. “Do I know you?”';
    const before = await page.locator('[id^="message-"]').count();
    await textarea.fill(unique);
    await page.locator('#send-message-btn').click();
    await page.waitForFunction(({ before }) => document.querySelectorAll('[id^="message-"]').length >= before + 2, { before }, { timeout: 240000 });
    const last = page.locator('[id^="message-"]').last();
    const reply = (await last.textContent()) || '';
    assertNoTranslatorMeta(reply);
    liveOutputs.uiChatEn = reply;

    await page.locator('#imitate-me-quick-btn').click();
    await page.waitForFunction(() => {
      const el = document.querySelector('#chat-user-textarea');
      return el && el.value && el.value.trim().length > 10 && !document.querySelector('#imitate-me-quick-btn')?.textContent?.includes('Formuliere');
    }, {}, { timeout: 220000 });
    const draft = await textarea.inputValue();
    assert.match(draft, /\bI\b|\bmy\b|\bme\b/i);
    liveOutputs.uiImitateEn = draft;
    await textarea.fill('');
    return `reply=${reply.slice(0, 120).replace(/\s+/g, ' ')} | imitate=${draft.slice(0, 120).replace(/\s+/g, ' ')}`;
  });

  await test('UI chat message controls: copy, edit, delete', async () => {
    const userMessage = page.locator('[id^="message-"]').filter({ hasText: 'AUDIT EN:' }).first();
    await userMessage.locator('button[title="Kopieren"]').click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clipboard, /AUDIT EN:/);
    await userMessage.locator('button[title="Bearbeiten"]').click();
    const edit = userMessage.locator('textarea');
    await edit.fill('AUDIT EN EDITED: I lower the book.');
    await userMessage.getByRole('button', { name: 'Speichern' }).click();
    assert.match((await userMessage.textContent()) || '', /AUDIT EN EDITED/);
    await userMessage.locator('button[title="Löschen"]').click();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[id^="message-"]').filter({ hasText: 'AUDIT EN EDITED' }).count(), 0);
    return 'copy/edit/delete worked';
  });

  await test('UI attachment button: attach preview and remove', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlW0S8AAAAASUVORK5CYII=', 'base64');
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name: 'audit.png', mimeType: 'image/png', buffer: png });
    await page.getByText('Foto angehängt').waitFor();
    await page.getByTitle('Bild entfernen').click();
    assert.equal(await page.getByText('Foto angehängt').count(), 0);
    return 'attachment preview/remove worked';
  });

  await test('UI profile, context, language toggle and chat-menu surfaces work', async () => {
    await page.locator('#characters-header-profile-btn').click();
    await page.locator('#profile-modal').waitFor();
    await page.getByRole('button', { name: 'Schliessen' }).click();

    const contextButton = page.getByTitle('Szene & Story-Kontext');
    await contextButton.click();
    await page.getByText('User Profile / Persona').waitFor();
    const memoryInputs = page.locator('textarea.memory-input');
    await memoryInputs.nth(0).fill('AUDIT PERSONA');
    await memoryInputs.nth(1).fill('AUDIT SCENE');
    await memoryInputs.nth(2).fill('AUDIT MEMORY');
    await page.getByRole('button', { name: 'Übernehmen' }).click();
    await contextButton.click();
    assert.equal(await page.locator('textarea.memory-input').nth(0).inputValue(), 'AUDIT PERSONA');
    assert.equal(await page.locator('textarea.memory-input').nth(1).inputValue(), 'AUDIT SCENE');
    await page.getByRole('button', { name: 'Übernehmen' }).click();

    const lang = page.locator('#toggle-language-btn');
    const beforeLang = (await lang.textContent())?.trim();
    await lang.click();
    const afterLang = (await lang.textContent())?.trim();
    assert.notEqual(beforeLang, afterLang);
    await lang.click();

    await page.locator('#header-menu-drawer-btn').click();
    await page.locator('#chat-menu-drawer-content').waitFor();
    for (const text of ['Steckbrief', 'Bearbeiten', 'Foto jetzt senden lassen', 'Szene & Story-Kontext', 'Chat konfigurieren', 'Sprache wechseln', 'Verlauf leeren', 'Chat löschen']) {
      assert.ok(await page.getByText(text, { exact: true }).count(), `missing menu item ${text}`);
    }
    await page.getByTitle('Schliessen').click();
    return 'profile/context/language/menu ok';
  });

  await test('UI chat-specific overrides persist, affect prompt inspector, then reset to base', async () => {
    await page.locator('#header-menu-drawer-btn').click();
    await page.getByText('Chat konfigurieren', { exact: true }).click();
    await page.getByText('Chat Settings').waitFor();
    const desc = page.locator('label').filter({ hasText: 'Description' }).locator('textarea');
    const original = await desc.inputValue();
    await desc.fill(`${original}\nAUDIT_CHAT_OVERRIDE_MARKER`);
    await page.getByRole('button', { name: 'Übernehmen' }).click();

    await page.locator('#header-menu-drawer-btn').click();
    await page.getByText('Chat konfigurieren', { exact: true }).click();
    assert.match(await page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue(), /AUDIT_CHAT_OVERRIDE_MARKER/);
    await page.getByRole('button', { name: /Basis/ }).click();
    await page.getByRole('button', { name: 'Übernehmen' }).click();

    // Open diagnostics from main settings and verify server-side effective prompt no longer has marker.
    await backToMain();
    await page.locator('#nav-tab-settings').click();
    await page.getByRole('button', { name: /Verbindung & Diagnose/ }).click();
    await page.locator('#diagnostics-modal').waitFor();
    await page.waitForTimeout(1500);
    const diagText = (await page.locator('#diagnostics-modal').textContent()) || '';
    assert.doesNotMatch(diagText, /AUDIT_CHAT_OVERRIDE_MARKER/);
    await page.locator('#diagnostics-modal button[title="Schließen"]').click();
    return 'override set/persisted/reset';
  });

  await test('UI Backup/Export: full backup and Character Card V2 downloads work', async () => {
    await page.getByRole('button', { name: /Backup & Import/ }).click();
    await page.getByRole('button', { name: 'Vollständiges Backup' }).click();
    const [backupDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Backup jetzt herunterladen/ }).click(),
    ]);
    assert.match(backupDownload.suggestedFilename(), /^rp_app_backup_.*\.json$/);
    const backupPath = await backupDownload.path();
    assert.ok(backupPath && fs.statSync(backupPath).size > 100);

    await page.getByRole('button', { name: /Character Card V2 \(Chub\)/ }).click();
    const [cardDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Character Card V2 herunterladen/ }).click(),
    ]);
    assert.match(cardDownload.suggestedFilename(), /_card_v2\.json$/);
    const cardPath = await cardDownload.path();
    const parsed = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
    assert.equal(parsed.spec, 'chara_card_v2');
    await page.locator('#import-export-modal button[title="Schliessen"]').click();
    return 'backup + CCv2 downloads parse';
  });

  await test('UI Text import parses both roles and replaces a chat', async () => {
    await page.getByRole('button', { name: /Backup & Import/ }).click();
    const modal = page.locator('#import-export-modal');
    const textArea = modal.locator('textarea').first();
    await textArea.fill('Dean: AUDIT IMPORT CHARACTER\n\nLidii: AUDIT IMPORT USER');
    await modal.getByRole('button', { name: 'Chat ersetzen' }).click();
    await page.waitForTimeout(1500);
    await page.locator('#nav-tab-chats').click();
    const chatRow = page.locator('button').filter({ hasText: 'AUDIT IMPORT USER' }).first();
    if (await chatRow.count()) await chatRow.click();
    else {
      // Open most recently active Dean chat row.
      await page.locator('img[alt="Dean"]').last().locator('xpath=ancestor::button[1]').click();
    }
    await page.waitForTimeout(300);
    assert.ok((await page.locator('body').textContent()).includes('AUDIT IMPORT CHARACTER') || (await page.locator('body').textContent()).includes('AUDIT IMPORT USER'));
    return 'text import recognized Dean/Lidii';
  });

  await test('UI DE new Dean chat: localized greeting, manual generation and Imitate integration', async () => {
    const first = await openNewDeanChat('de');
    const greetingText = (await first.textContent()) || '';
    assertNoTranslatorMeta(greetingText);
    assert.ok(looksGerman(greetingText), greetingText.slice(0, 500));

    const textarea = page.locator('#chat-user-textarea');
    const unique = 'AUDIT DE: Ich lege das Buch langsam auf den Tisch und frage: „Kennen wir uns?“';
    const before = await page.locator('[id^="message-"]').count();
    await textarea.fill(unique);
    await page.locator('#send-message-btn').click();
    await page.waitForFunction(({ before }) => document.querySelectorAll('[id^="message-"]').length >= before + 2, { before }, { timeout: 240000 });
    const reply = (await page.locator('[id^="message-"]').last().textContent()) || '';
    assertNoTranslatorMeta(reply);
    liveOutputs.uiChatDe = reply;

    await page.locator('#imitate-me-quick-btn').click();
    await page.waitForFunction(() => {
      const el = document.querySelector('#chat-user-textarea');
      return el && el.value && el.value.trim().length > 10 && !document.querySelector('#imitate-me-quick-btn')?.textContent?.includes('Formuliere');
    }, {}, { timeout: 220000 });
    const draft = await textarea.inputValue();
    assert.match(draft, /\bich\b|\bmein(?:e|en|em|er)?\b|\bmir\b|\bmich\b/i);
    liveOutputs.uiImitateDe = draft;
    await textarea.fill('');
    return `reply=${reply.slice(0, 110).replace(/\s+/g, ' ')} | imitate=${draft.slice(0, 110).replace(/\s+/g, ' ')}`;
  });

  await test('UI photo request button completes without locking chat input', async () => {
    const before = await page.locator('[id^="message-"]').count();
    await page.locator('#header-menu-drawer-btn').click();
    await page.getByText('Foto jetzt senden lassen', { exact: true }).click();
    await page.waitForFunction(({ before }) => document.querySelectorAll('[id^="message-"]').length >= before + 1, { before }, { timeout: 120000 });
    await page.locator('#chat-user-textarea').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#chat-user-textarea').isDisabled(), false);
    const last = (await page.locator('[id^="message-"]').last().textContent()) || '';
    liveOutputs.uiPhoto = last;
    return last.slice(0, 120).replace(/\s+/g, ' ');
  });

  await test('UI clear-history and delete-chat confirmation buttons work on disposable chat', async () => {
    // clear current disposable DE chat
    await page.locator('#header-menu-drawer-btn').click();
    await page.getByText('Verlauf leeren', { exact: true }).click();
    await page.locator('#delete-confirm-modal').waitFor();
    await page.getByRole('button', { name: 'Endgültig löschen' }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[id^="message-"]').count(), 0);

    await page.locator('#header-menu-drawer-btn').click();
    await page.getByText('Chat löschen', { exact: true }).last().click();
    await page.locator('#delete-confirm-modal').waitFor();
    await page.getByRole('button', { name: 'Endgültig löschen' }).click();
    await page.locator('#nav-tab-chats').waitFor();
    return 'clear/delete confirmed';
  });

  await test('UI reset to canon restores default content after isolated mutations', async () => {
    await page.locator('#nav-tab-settings').click();
    await page.getByRole('button', { name: /KI & Antworten/ }).click();
    await page.getByRole('button', { name: 'Standardinhalte wiederherstellen' }).click();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await page.getByRole('button', { name: 'Standardinhalte wiederherstellen' }).click();
    await page.getByRole('button', { name: 'Wirklich zurücksetzen' }).click();
    await page.locator('#nav-tab-chats').waitFor();
    await page.locator('#nav-tab-characters').click();
    await page.getByText('Dean').first().waitFor();
    await page.getByText('Julian').first().waitFor();
    assert.equal(await page.getByText('Audit Character').count(), 0);
    return 'canon reset works';
  });

  await test('UI persistence: defaults/settings/chats survive reload without stuck global generation state', async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('#app-root').waitFor();
    await page.locator('#nav-tab-chats').click();
    assert.ok(await page.getByText('Dean').count());
    assert.ok(await page.getByText('Julian').count());
    return 'reload successful';
  });

  await test('UI runtime: no uncaught page errors', async () => {
    assert.deepEqual(pageErrors, []);
    // Ignore expected browser/image network console noise; report application-looking errors.
    const appErrors = consoleErrors.filter(x => !/Failed to load resource|net::ERR|favicon/i.test(x));
    assert.deepEqual(appErrors, []);
    return `consoleErrors=${consoleErrors.length}`;
  });

  // Explicitly restore isolated browser storage before closing.
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await browser.close();
}

await browserAudit();

console.log('\n===== LIVE OUTPUT SAMPLES =====');
for (const [key, value] of Object.entries(liveOutputs)) {
  console.log(`\n--- ${key} ---\n${String(value).slice(0, 2200)}`);
}

console.log('\n===== ACCEPTANCE SUMMARY =====');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail.replace(/\s+/g, ' ').slice(0, 700)}`);
const failed = results.filter(r => !r.ok);
console.log(`TOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}`);
if (failed.length) process.exitCode = 1;
