import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.PREVIEW_URL || 'https://chatapp-preview.onrender.com';
const results = [];
const failures = [];

async function test(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: String(detail || 'ok') });
    console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const detail = String(error?.stack || error?.message || error);
    results.push({ name, ok: false, detail });
    failures.push({ name, detail });
    console.log(`❌ ${name} — ${detail}`);
  }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const originalGreeting = `The spine of The Great Gatsby presses into your palm as you slide it into place on the shelf. The library is quiet, the way you like it—just the hum of fluorescent lights and the occasional rustle of pages. You don't notice him at first, but he's three rows over, partially hidden by a display of new arrivals. His fingers trail along the books without reading a single title. His focus is fixed entirely on the sliver of you visible through the gap between volumes: the curve of your neck as you reach up, the way your lips purse when you concentrate.\n\nHe imagines you're performing for him. You have to be. Why else would you tilt your head just so? Why else would your hips sway that gentle arc as you step down the ladder?`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });

let mockJobCounter = 0;
const mockJobs = new Map();

await context.route('**/api/localize-greeting', async route => {
  const body = route.request().postDataJSON() || {};
  const content = body.language === 'de'
    ? `Der Buchrücken von The Great Gatsby drückt in deine Handfläche, während du ihn ins Regal schiebst. Die Bibliothek ist ruhig; nur das Summen der Lampen und das Rascheln von Seiten ist zu hören. Du bemerkst den Fremden zunächst nicht. Er steht drei Reihen weiter, halb hinter den Neuerscheinungen verborgen.\n\nEr stellt sich vor, jede kleine Bewegung von dir könnte für ihn bestimmt sein.`
    : String(body.greeting || '');
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content, modelUsed: 'ui-audit-mock', latencyMs: 1 }) });
});

await context.route('**/api/summarize', async route => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ summary: 'AUDIT MOCK MEMORY', modelUsed: 'ui-audit-mock', latencyMs: 1, summarizedMessages: 1 }) });
});

await context.route('**/api/jobs/**', async route => {
  const req = route.request();
  const url = new URL(req.url());
  const pathname = url.pathname;
  const method = req.method();

  if (method === 'POST' && ['/api/jobs/chat', '/api/jobs/imitate', '/api/jobs/start-chat', '/api/jobs/photo'].includes(pathname)) {
    const body = req.postDataJSON() || {};
    const type = pathname.split('/').pop();
    const id = `ui-audit-${type}-${++mockJobCounter}`;
    const de = body.language === 'de';
    const baseJob = { id, type, characterId: body.characterId, chatId: body.chatId, createdAt: Date.now() };

    if (type === 'chat') {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const last = String(messages.at(-1)?.content || '');
      if (last.includes('AUDIT FORCE FAILURE')) {
        mockJobs.set(id, { ...baseJob, status: 'failed', completedAt: Date.now(), error: 'AUDIT simulated generation failure' });
      } else {
        mockJobs.set(id, { ...baseJob, status: 'completed', completedAt: Date.now(), result: {
          content: de
            ? 'Ich ziehe den freien Stuhl heran und setze mich dir gegenüber. „Nicht richtig“, sage ich ruhig. „Aber jetzt reden wir.“'
            : 'I pull out the empty chair and sit across from you. “Not properly,” I say quietly. “But we are talking now.”',
          modelUsed: 'ui-audit-mock', latencyMs: 1,
          role: body.character?.id === 'char-dean' ? 'dean' : 'character', speakerName: body.character?.name || 'Character'
        }});
      }
    } else if (type === 'imitate') {
      mockJobs.set(id, { ...baseJob, status: 'completed', completedAt: Date.now(), result: {
        draft: de
          ? 'Ich senke das Buch ein wenig und mustere den Fremden. „Kennen wir uns?“'
          : 'I lower the book slightly and look at the stranger. “Do I know you?”',
        modelUsed: 'ui-audit-mock', latencyMs: 1, role: 'lidii', speakerName: body.character?.playerAddressName || 'Lidii'
      }});
    } else if (type === 'start-chat') {
      mockJobs.set(id, { ...baseJob, status: 'completed', completedAt: Date.now(), result: {
        content: de ? 'Ich trete aus dem Gang und eröffne die Szene.' : 'I step out of the aisle and open the scene.',
        modelUsed: 'ui-audit-mock', latencyMs: 1,
        role: body.character?.id === 'char-dean' ? 'dean' : 'character', speakerName: body.character?.name || 'Character'
      }});
    } else {
      mockJobs.set(id, { ...baseJob, status: 'completed', completedAt: Date.now(), result: {
        content: de ? 'Ich schicke dir einen kurzen Eindruck aus der aktuellen Szene.' : 'I send you a brief glimpse of the current scene.',
        modelUsed: 'ui-audit-mock', latencyMs: 1,
        role: body.character?.id === 'char-dean' ? 'dean' : 'character', speakerName: body.character?.name || 'Character'
      }});
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobId: id, status: 'running' }) });
    return;
  }

  if (method === 'GET') {
    const id = pathname.split('/').pop();
    if (mockJobs.has(id)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockJobs.get(id)) });
      return;
    }
  }

  await route.continue();
});

const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.setDefaultTimeout(25000);

async function initialCleanStart() {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('#app-root').waitFor({ state: 'visible', timeout: 120000 });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('#app-root').waitFor({ state: 'visible', timeout: 120000 });
}

async function backToMain() {
  if (await page.locator('#header-back-to-chats').count()) {
    await page.locator('#header-back-to-chats').click();
    await page.locator('#nav-tab-chats').waitFor();
  }
}

async function closeDrawer() {
  if (await page.locator('#chat-menu-drawer-content').count()) {
    await page.locator('#chat-menu-drawer-content button[title="Schliessen"]').click();
    await page.locator('#chat-menu-drawer-backdrop').waitFor({ state: 'detached' });
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
  await page.locator('#chat-user-textarea').waitFor({ state: 'visible', timeout: 60000 });
  const first = page.locator('[id^="message-"]').first();
  await first.waitFor({ state: 'visible', timeout: 60000 });
  return first;
}

async function waitForMessageCountAtLeast(count, timeout = 45000) {
  await page.waitForFunction(expected => document.querySelectorAll('[id^="message-"]').length >= expected, count, { timeout });
}

await test('Fresh mobile shell, bottom navigation and chat search', async () => {
  await initialCleanStart();
  for (const id of ['#nav-tab-chats', '#nav-tab-characters', '#nav-tab-settings']) await page.locator(id).waitFor();
  const search = page.getByPlaceholder('Chats durchsuchen');
  await search.fill('Dean');
  assert.equal(await search.inputValue(), 'Dean');
  assert.ok(await page.getByText('Dean').count());
  await search.fill('NO_SUCH_CHAT');
  assert.ok(await page.getByText('Noch kein Chat').count() || !(await page.getByText('Dean').count()));
  await search.fill('');
  return 'navigation/search render and react';
});

await test('Settings home: every destination opens and closes', async () => {
  await page.locator('#nav-tab-settings').click();
  await page.getByRole('heading', { name: 'Einstellungen' }).waitFor();
  await page.getByRole('button', { name: /KI & Antworten/ }).click();
  await page.getByRole('heading', { name: 'KI & Antworten' }).waitFor();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('button', { name: /Backup & Import/ }).click();
  await page.locator('#import-export-modal').waitFor();
  await page.locator('#import-export-modal button[title="Schliessen"]').click();
  await page.getByRole('button', { name: /Verbindung & Diagnose/ }).click();
  await page.locator('#diagnostics-modal').waitFor();
  await page.getByText('Prompt Inspector (Chub / CCv2)').waitFor();
  if (await page.getByRole('button', { name: /Echtzeit-Logs/ }).count()) await page.getByRole('button', { name: /Echtzeit-Logs/ }).click();
  if (await page.getByRole('button', { name: 'Logs leeren' }).count()) await page.getByRole('button', { name: 'Logs leeren' }).click();
  await page.locator('#diagnostics-modal button[title="Schließen"]').click();
  return 'AI/data/diagnostics surfaces opened';
});

await test('Advanced generation settings persist and can be restored', async () => {
  await page.getByRole('button', { name: /KI & Antworten/ }).click();
  await page.getByText('Erweiterte Einstellungen').click();
  const ranges = page.locator('input[type="range"]');
  assert.ok(await ranges.count() >= 6);
  await ranges.nth(0).evaluate(el => { el.value = '1.02'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  const promptNote = page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea');
  const prefill = page.locator('label').filter({ hasText: 'Assistant Prefill' }).locator('textarea');
  await promptNote.fill('AUDIT_PROMPT_NOTE');
  await prefill.fill('AUDIT_PREFILL');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Gespeichert', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Abbrechen' }).click();

  await page.getByRole('button', { name: /KI & Antworten/ }).click();
  await page.getByText('Erweiterte Einstellungen').click();
  assert.equal(await page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea').inputValue(), 'AUDIT_PROMPT_NOTE');
  assert.equal(await page.locator('label').filter({ hasText: 'Assistant Prefill' }).locator('textarea').inputValue(), 'AUDIT_PREFILL');
  await page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea').fill('');
  await page.locator('label').filter({ hasText: 'Assistant Prefill' }).locator('textarea').fill('');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Gespeichert', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  return 'saved/reopened/restored';
});

await test('Character editor: all CCv2 tabs, alternate greeting and Character Book', async () => {
  await page.locator('#nav-tab-characters').click();
  await page.getByRole('button', { name: 'Neuer Charakter' }).first().click();
  await page.getByRole('heading', { name: 'Neuer Charakter' }).waitFor();
  await page.locator('label').filter({ hasText: 'Charaktername' }).locator('input').fill('Audit Character');
  await page.locator('label').filter({ hasText: 'Name von dir' }).locator('input').fill('Audit User');

  await page.getByRole('button', { name: 'Charakter', exact: true }).click();
  let areas = page.locator('main textarea');
  await areas.nth(0).fill('Audit description');
  await areas.nth(1).fill('Audit personality');
  await areas.nth(2).fill('Audit scenario');

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  areas = page.locator('main textarea');
  await areas.nth(0).fill('Hello {{user}} from Audit Character.');
  await areas.nth(1).fill('Alternate hello {{user}}.');
  await areas.nth(1).locator('xpath=..').locator('button').first().click();

  await page.getByRole('button', { name: 'Erweitert', exact: true }).click();
  areas = page.locator('main textarea');
  await areas.nth(0).fill('Audit system {{original}}');
  await areas.nth(1).fill('Audit post history');
  await areas.nth(2).fill('Audit character note');

  await page.getByRole('button', { name: 'Character Book', exact: true }).click();
  await page.getByRole('button', { name: /Lore-Eintrag hinzufügen/ }).click();
  await page.locator('input[placeholder="library, rain"]').fill('audit-key');
  await page.locator('label').filter({ hasText: 'Inhalt' }).locator('textarea').last().fill('Audit lore content');
  await page.getByRole('button', { name: 'Permanent' }).click();
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Gespeichert', exact: true }).waitFor();
  await page.locator('header button').last().click();

  await page.getByText('Audit Character').waitFor();
  await page.getByRole('button', { name: 'Audit Character bearbeiten' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  assert.match((await page.locator('main').textContent()) || '', /Hello \{\{user\}\} from Audit Character/);
  assert.match((await page.locator('main').textContent()) || '', /Alternate hello \{\{user\}\}/);
  await page.getByRole('button', { name: 'Character Book', exact: true }).click();
  assert.match((await page.locator('main').textContent()) || '', /Audit lore content/);
  await page.locator('header button').last().click();
  return 'create/save/reopen all prompt-relevant tabs';
});

await test('Alternate greeting selection starts disposable character chat', async () => {
  await page.locator('#nav-tab-chats').click();
  const auditPortrait = page.locator('img[alt="Audit Character"]').first();
  await auditPortrait.locator('xpath=ancestor::button[1]').click();
  await page.getByText('Neue Story').waitFor();
  const alt = page.getByRole('button', { name: /Alternate hello Audit User/ });
  await alt.click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Chat starten' }).click();
  await page.locator('#chat-user-textarea').waitFor();
  const first = page.locator('[id^="message-"]').first();
  await first.waitFor();
  assert.match((await first.textContent()) || '', /Alternate hello Audit User/);
  await backToMain();
  return 'alternate greeting chosen and macro resolved';
});

await test('Chat-list kebab menu opens settings and closes without mutation', async () => {
  await page.locator('#nav-tab-chats').click();
  const menuButtons = page.getByRole('button', { name: 'Chat-Menü' });
  assert.ok(await menuButtons.count() >= 1);
  await menuButtons.first().click();
  await page.getByText('Chat-Einstellungen', { exact: true }).click();
  await page.getByText('Chat Settings').waitFor();
  await page.locator('header button').last().click();
  await page.getByRole('heading', { name: 'Chats' }).waitFor();
  return 'list menu settings path works';
});

await test('Fresh EN Dean chat: original greeting and immediate Imitate first-person path', async () => {
  const first = await openNewDeanChat('en');
  const greeting = (await first.textContent()) || '';
  assert.match(greeting, /The spine of The Great Gatsby presses into your palm/i);
  assert.match(greeting, /three rows over/i);

  await page.locator('#imitate-me-quick-btn').click();
  await page.waitForFunction(() => {
    const el = document.querySelector('#chat-user-textarea');
    return el && el.value && el.value.trim().length > 10;
  }, {}, { timeout: 45000 });
  const draft = await page.locator('#chat-user-textarea').inputValue();
  assert.match(draft, /\bI\b|\bmy\b|\bme\b/i);
  assert.doesNotMatch(draft, /you.ve been watching me|Dean/i);
  await page.locator('#chat-user-textarea').fill('');
  return draft;
});

await test('EN manual message -> async reply -> composer unlocks', async () => {
  const textarea = page.locator('#chat-user-textarea');
  const before = await page.locator('[id^="message-"]').count();
  await textarea.fill('AUDIT EN: I lower the book and ask, “Do I know you?”');
  await page.locator('#send-message-btn').click();
  await waitForMessageCountAtLeast(before + 2);
  const reply = (await page.locator('[id^="message-"]').last().textContent()) || '';
  assert.match(reply, /pull out the empty chair|sit across/i);
  assert.equal(await textarea.isDisabled(), false);
  return reply;
});

await test('Message buttons: copy, edit and delete', async () => {
  const userMessage = page.locator('[id^="message-"]').filter({ hasText: 'AUDIT EN:' }).first();
  await userMessage.locator('button[title="Kopieren"]').click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /AUDIT EN:/);
  await userMessage.locator('button[title="Bearbeiten"]').click();
  await userMessage.locator('textarea').fill('AUDIT EN EDITED: I lower the book.');
  await userMessage.getByRole('button', { name: 'Speichern' }).click();
  assert.match((await userMessage.textContent()) || '', /AUDIT EN EDITED/);
  await userMessage.locator('button[title="Löschen"]').click();
  await sleep(250);
  assert.equal(await page.locator('[id^="message-"]').filter({ hasText: 'AUDIT EN EDITED' }).count(), 0);
  return 'copy/edit/delete';
});

await test('Attachment button: add preview and remove before sending', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlW0S8AAAAASUVORK5CYII=', 'base64');
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name: 'audit.png', mimeType: 'image/png', buffer: png });
  await page.getByText('Foto angehängt').waitFor();
  await page.getByTitle('Bild entfernen').click();
  assert.equal(await page.getByText('Foto angehängt').count(), 0);
  return 'attachment add/remove';
});

await test('Header profile opens; profile edit path opens Character Editor', async () => {
  await page.locator('#characters-header-profile-btn').click();
  await page.locator('#profile-modal').waitFor();
  await page.getByRole('button', { name: 'Profil bearbeiten' }).click();
  await page.getByRole('button', { name: 'Character Book', exact: true }).waitFor();
  await page.locator('header button').last().click();
  await page.locator('#chat-user-textarea').waitFor();
  return 'profile + edit';
});

await test('Story context/persona saves, reopens, and summarize button works', async () => {
  const contextButton = page.getByTitle('Szene & Story-Kontext');
  await contextButton.click();
  await page.getByText('User Profile / Persona').waitFor();
  let inputs = page.locator('textarea.memory-input');
  await inputs.nth(0).fill('AUDIT PERSONA');
  await inputs.nth(1).fill('AUDIT SCENE');
  await inputs.nth(2).fill('AUDIT MEMORY');
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await contextButton.click();
  inputs = page.locator('textarea.memory-input');
  assert.equal(await inputs.nth(0).inputValue(), 'AUDIT PERSONA');
  assert.equal(await inputs.nth(1).inputValue(), 'AUDIT SCENE');
  await page.getByRole('button', { name: 'KI aktualisieren' }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('textarea.memory-input')).some(el => el.value.includes('AUDIT MOCK MEMORY')), {}, { timeout: 30000 });
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  return 'persona/scene/memory/summarize';
});

await test('Header language toggle switches both directions', async () => {
  const lang = page.locator('#toggle-language-btn');
  const before = (await lang.textContent())?.trim();
  await lang.click();
  const after = (await lang.textContent())?.trim();
  assert.notEqual(before, after);
  await lang.click();
  assert.equal((await lang.textContent())?.trim(), before);
  return `${before} -> ${after} -> ${before}`;
});

await test('Chat drawer exposes and opens every non-destructive destination', async () => {
  await page.locator('#header-menu-drawer-btn').click();
  await page.locator('#chat-menu-drawer-content').waitFor();
  for (const label of ['Steckbrief', 'Bearbeiten', 'Foto jetzt senden lassen', 'Szene & Story-Kontext', 'Chat konfigurieren', 'Sprache wechseln', 'Verlauf leeren', 'Chat löschen']) {
    assert.ok(await page.getByText(label, { exact: true }).count(), `missing ${label}`);
  }
  await page.getByText('Steckbrief', { exact: true }).click();
  await page.locator('#profile-modal').waitFor();
  await page.locator('#profile-modal button[title="Schliessen"]').click();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Bearbeiten', { exact: true }).click();
  await page.getByRole('button', { name: 'Character Book', exact: true }).waitFor();
  await page.locator('header button').last().click();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Szene & Story-Kontext', { exact: true }).click();
  await page.getByText('User Profile / Persona').waitFor();
  await page.getByRole('button', { name: 'Übernehmen' }).click();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Chat konfigurieren', { exact: true }).click();
  await page.getByText('Chat Settings').waitFor();
  await page.locator('header button').last().click();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Sprache wechseln', { exact: true }).click();
  await closeDrawer();
  return 'drawer profile/edit/context/settings/language';
});

await test('Per-chat Character Override persists, then Basis restores base values', async () => {
  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Chat konfigurieren', { exact: true }).click();
  const desc = page.locator('label').filter({ hasText: 'Description' }).locator('textarea');
  const base = await desc.inputValue();
  await desc.fill(`${base}\nAUDIT_CHAT_OVERRIDE_MARKER`);
  await page.getByRole('button', { name: 'Übernehmen' }).click();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Chat konfigurieren', { exact: true }).click();
  assert.match(await page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue(), /AUDIT_CHAT_OVERRIDE_MARKER/);
  await page.getByRole('button', { name: /Basis/ }).click();
  await page.getByRole('button', { name: 'Übernehmen' }).click();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Chat konfigurieren', { exact: true }).click();
  assert.doesNotMatch(await page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue(), /AUDIT_CHAT_OVERRIDE_MARKER/);
  await page.locator('header button').last().click();
  return 'override save/reopen/reset';
});

let backupPath;
await test('Backup export downloads valid full JSON', async () => {
  await backToMain();
  await page.locator('#nav-tab-settings').click();
  await page.getByRole('button', { name: /Backup & Import/ }).click();
  await page.getByRole('button', { name: 'Vollständiges Backup' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Backup jetzt herunterladen/ }).click(),
  ]);
  backupPath = await download.path();
  assert.ok(backupPath && fs.statSync(backupPath).size > 100);
  const parsed = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  assert.ok(parsed.characters && parsed.chats);
  await page.locator('#import-export-modal button[title="Schliessen"]').click();
  return download.suggestedFilename();
});

await test('Character Card V2 export downloads valid chara_card_v2 JSON', async () => {
  await page.getByRole('button', { name: /Backup & Import/ }).click();
  await page.getByRole('button', { name: /Character Card V2 \(Chub\)/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Character Card V2 herunterladen/ }).click(),
  ]);
  const p = await download.path();
  assert.ok(p);
  const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(parsed.spec, 'chara_card_v2');
  assert.ok(parsed.data?.name);
  await page.locator('#import-export-modal button[title="Schliessen"]').click();
  return `${parsed.data.name} / ${download.suggestedFilename()}`;
});

await test('Character Card V2 text import creates character, full backup restore removes it', async () => {
  const card = {
    spec: 'chara_card_v2', spec_version: '2.0',
    data: {
      name: 'Audit Imported Card', description: 'Audit imported description', personality: 'Audit imported personality', scenario: 'Audit imported scenario',
      first_mes: 'Hello {{user}}.', mes_example: '', creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [], creator: '', character_version: '1.0', extensions: {}
    }
  };
  await page.getByRole('button', { name: /Backup & Import/ }).click();
  await page.getByRole('button', { name: /Character Card V2 \(Chub\)/ }).click();
  await page.getByPlaceholder('JSON-Inhalt der Character Card V2 hier einfügen...').fill(JSON.stringify(card));
  await page.getByRole('button', { name: 'Karte importieren' }).click();
  await page.waitForTimeout(1500);
  await page.locator('#nav-tab-characters').click();
  await page.getByText('Audit Imported Card').waitFor();

  await page.locator('#nav-tab-settings').click();
  await page.getByRole('button', { name: /Backup & Import/ }).click();
  await page.getByRole('button', { name: 'Vollständiges Backup' }).click();
  const backupInput = page.locator('input[type="file"][accept=".json"]').last();
  await backupInput.setInputFiles(backupPath);
  await page.waitForTimeout(1600);
  await page.locator('#nav-tab-characters').click();
  assert.equal(await page.getByText('Audit Imported Card').count(), 0);
  return 'card import + full-state restoration';
});

await test('Text import replaces a disposable chat with both roles', async () => {
  await page.locator('#nav-tab-settings').click();
  await page.getByRole('button', { name: /Backup & Import/ }).click();
  const modal = page.locator('#import-export-modal');
  await modal.locator('textarea').first().fill('Dean: AUDIT IMPORT CHARACTER\n\nLidii: AUDIT IMPORT USER');
  await modal.getByRole('button', { name: 'Chat ersetzen' }).click();
  await page.waitForTimeout(1500);
  await page.locator('#nav-tab-chats').click();
  const row = page.locator('button').filter({ hasText: 'AUDIT IMPORT USER' }).first();
  if (await row.count()) await row.click();
  else await page.locator('img[alt="Dean"]').last().locator('xpath=ancestor::button[1]').click();
  await page.waitForTimeout(250);
  const body = (await page.locator('body').textContent()) || '';
  assert.ok(body.includes('AUDIT IMPORT CHARACTER') || body.includes('AUDIT IMPORT USER'));
  return 'text parser/import path';
});

await test('Fresh DE Dean chat: localized greeting, manual reply and Imitate', async () => {
  const first = await openNewDeanChat('de');
  const greeting = (await first.textContent()) || '';
  assert.match(greeting, /Buchrücken|Bibliothek/i);
  const textarea = page.locator('#chat-user-textarea');
  const before = await page.locator('[id^="message-"]').count();
  await textarea.fill('AUDIT DE: Ich lege das Buch auf den Tisch. „Kennen wir uns?“');
  await page.locator('#send-message-btn').click();
  await waitForMessageCountAtLeast(before + 2);
  assert.match((await page.locator('[id^="message-"]').last().textContent()) || '', /Stuhl|gegenüber/i);
  await page.locator('#imitate-me-quick-btn').click();
  await page.waitForFunction(() => {
    const el = document.querySelector('#chat-user-textarea');
    return el && el.value && /\bIch\b/i.test(el.value);
  }, {}, { timeout: 45000 });
  const draft = await textarea.inputValue();
  assert.match(draft, /\bIch\b|\bmein/i);
  await textarea.fill('');
  return draft;
});

await test('Situational photo request job completes and never leaves composer locked', async () => {
  const before = await page.locator('[id^="message-"]').count();
  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Foto jetzt senden lassen', { exact: true }).click();
  await waitForMessageCountAtLeast(before + 1);
  assert.equal(await page.locator('#chat-user-textarea').isDisabled(), false);
  assert.match((await page.locator('[id^="message-"]').last().textContent()) || '', /Eindruck|Szene/i);
  return 'photo job lifecycle/unlock';
});

await test('Failed generation surfaces error and unlocks composer', async () => {
  const textarea = page.locator('#chat-user-textarea');
  await textarea.fill('AUDIT FORCE FAILURE');
  await page.locator('#send-message-btn').click();
  await page.getByText('AUDIT simulated generation failure').waitFor({ timeout: 30000 });
  assert.equal(await textarea.isDisabled(), false);
  return 'failed job error visible + input recovered';
});

await test('Clear-history confirmation works on disposable DE chat', async () => {
  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Verlauf leeren', { exact: true }).click();
  await page.locator('#delete-confirm-modal').waitFor();
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();
  await sleep(250);
  assert.equal(await page.locator('[id^="message-"]').count(), 0);
  return 'history cleared';
});

await test('Delete-chat confirmation returns to chat list', async () => {
  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Chat löschen', { exact: true }).last().click();
  await page.locator('#delete-confirm-modal').waitFor();
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();
  await page.locator('#nav-tab-chats').waitFor();
  return 'chat deleted';
});

await test('Temporary Audit Character can be deleted', async () => {
  await page.locator('#nav-tab-characters').click();
  if (await page.getByText('Audit Character').count()) {
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Audit Character löschen' }).click();
    await sleep(300);
  }
  assert.equal(await page.getByText('Audit Character').count(), 0);
  return 'temporary character removed';
});

await test('Reset defaults cancel leaves data; confirm restores canonical Dean/Julian', async () => {
  await page.locator('#nav-tab-settings').click();
  await page.getByRole('button', { name: /KI & Antworten/ }).click();
  await page.getByRole('button', { name: 'Standardinhalte wiederherstellen' }).click();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('button', { name: 'Standardinhalte wiederherstellen' }).click();
  await page.getByRole('button', { name: 'Wirklich zurücksetzen' }).click();
  await page.locator('#nav-tab-characters').click();
  await page.getByText('Dean').first().waitFor();
  await page.getByText('Julian').first().waitFor();
  assert.equal(await page.getByText('Audit Character').count(), 0);
  assert.equal(await page.getByText('Audit Imported Card').count(), 0);
  return 'cancel + confirm reset';
});

await test('Real localStorage persistence survives browser reload', async () => {
  await page.locator('#nav-tab-settings').click();
  await page.getByRole('button', { name: /KI & Antworten/ }).click();
  await page.getByText('Erweiterte Einstellungen').click();
  await page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea').fill('AUDIT_PERSIST_AFTER_RELOAD');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Gespeichert', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Abbrechen' }).click();

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('#app-root').waitFor();
  await page.locator('#nav-tab-settings').click();
  await page.getByRole('button', { name: /KI & Antworten/ }).click();
  await page.getByText('Erweiterte Einstellungen').click();
  assert.equal(await page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea').inputValue(), 'AUDIT_PERSIST_AFTER_RELOAD');
  await page.locator('label').filter({ hasText: 'Prompt Note' }).locator('textarea').fill('');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Gespeichert', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  return 'reload preserved setting and setting restored';
});

await test('No uncaught browser runtime errors during full UI audit', async () => {
  assert.deepEqual(pageErrors, []);
  const appErrors = consoleErrors.filter(text => !/Failed to load resource|net::ERR|favicon/i.test(text));
  assert.deepEqual(appErrors, []);
  return `consoleErrors=${consoleErrors.length}`;
});

await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await browser.close();

console.log('\n===== DETERMINISTIC UI ACCEPTANCE SUMMARY =====');
for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'} | ${item.name} | ${item.detail.replace(/\s+/g, ' ').slice(0, 700)}`);
console.log(`TOTAL=${results.length} PASS=${results.length - failures.length} FAIL=${failures.length}`);
if (failures.length) process.exitCode = 1;
