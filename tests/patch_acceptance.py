from pathlib import Path

p = Path('tests/uiMockAcceptance.mjs')
s = p.read_text()

old = '''  const userMessage = page.locator('[id^="message-"]').filter({ hasText: 'AUDIT EN:' }).first();
  await userMessage.locator('button[title="Kopieren"]').click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /AUDIT EN:/);
  await userMessage.locator('button[title="Bearbeiten"]').click();
  await userMessage.locator('textarea').fill('AUDIT EN EDITED: I lower the book.');
  await userMessage.getByRole('button', { name: 'Speichern' }).click();
  assert.match((await userMessage.textContent()) || '', /AUDIT EN EDITED/);
  await userMessage.locator('button[title="Löschen"]').click();'''
new = '''  const userMessageCandidate = page.locator('[id^="message-"]').filter({ hasText: 'AUDIT EN:' }).first();
  const userMessageId = await userMessageCandidate.getAttribute('id');
  assert.ok(userMessageId, 'user message has no stable id');
  const userMessage = page.locator(`#${userMessageId}`);
  await userMessage.locator('button[title="Kopieren"]').click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /AUDIT EN:/);
  await userMessage.locator('button[title="Bearbeiten"]').click();
  await userMessage.locator('textarea').fill('AUDIT EN EDITED: I lower the book.');
  await userMessage.getByRole('button', { name: 'Speichern', exact: true }).click();
  assert.match((await userMessage.textContent()) || '', /AUDIT EN EDITED/);
  await userMessage.locator('button[title="Löschen"]').click();'''
if old not in s:
    raise SystemExit('message-control selector block not found')
s = s.replace(old, new)

old = "  await page.getByRole('button', { name: 'KI aktualisieren' }).click();"
new = """  const summarizeButton = page.locator('button').filter({ hasText: /aktualis/i }).last();
  await summarizeButton.waitFor({ state: 'visible' });
  if (await summarizeButton.isDisabled()) {
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => /aktualis/i.test(b.textContent || '') && !b.disabled), {}, { timeout: 30000 });
  }
  await page.locator('button').filter({ hasText: /aktualis/i }).last().click();"""
if old not in s:
    raise SystemExit('summarize selector not found')
s = s.replace(old, new)

old = '''  await page.getByText('Chat Settings').waitFor();
  await page.locator('header button').last().click();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Sprache wechseln', { exact: true }).click();'''
new = '''  await page.getByText('Chat Settings').waitFor();
  await page.locator('header button').last().click();
  await closeDrawer();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Sprache wechseln', { exact: true }).click();'''
if old not in s:
    raise SystemExit('drawer nested-settings block not found')
s = s.replace(old, new)

old = '''  await page.getByText('Chat konfigurieren', { exact: true }).click();
  const desc = page.locator('label').filter({ hasText: 'Description' }).locator('textarea');
  const base = await desc.inputValue();
  await desc.fill(`${base}\\nAUDIT_CHAT_OVERRIDE_MARKER`);
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
  return 'override save/reopen/reset';'''
new = '''  await page.getByText('Chat konfigurieren', { exact: true }).click();
  const desc = page.locator('label').filter({ hasText: 'Description' }).locator('textarea');
  await page.waitForFunction(() => {
    const label = Array.from(document.querySelectorAll('label')).find(el => (el.textContent || '').includes('Description'));
    const textarea = label?.querySelector('textarea');
    return Boolean(textarea && textarea.value.trim().length > 0);
  });
  const base = await desc.inputValue();
  await desc.fill(`${base}\\nAUDIT_CHAT_OVERRIDE_MARKER`);
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await page.waitForFunction(() => {
    const chats = JSON.parse(localStorage.getItem('rp_chat_sessions_v2') || '[]');
    return chats.some(chat => String(chat?.characterSettings?.description || '').includes('AUDIT_CHAT_OVERRIDE_MARKER'));
  });
  await closeDrawer();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Chat konfigurieren', { exact: true }).click();
  await page.waitForFunction(() => {
    const label = Array.from(document.querySelectorAll('label')).find(el => (el.textContent || '').includes('Description'));
    const textarea = label?.querySelector('textarea');
    return Boolean(textarea && textarea.value.includes('AUDIT_CHAT_OVERRIDE_MARKER'));
  });
  assert.match(await page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue(), /AUDIT_CHAT_OVERRIDE_MARKER/);
  await page.getByRole('button', { name: /Basis/ }).click();
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await page.waitForFunction(() => {
    const chats = JSON.parse(localStorage.getItem('rp_chat_sessions_v2') || '[]');
    return chats.some(chat => chat?.characterSettings && !String(chat.characterSettings.description || '').includes('AUDIT_CHAT_OVERRIDE_MARKER'));
  });
  await closeDrawer();

  await page.locator('#header-menu-drawer-btn').click();
  await page.getByText('Chat konfigurieren', { exact: true }).click();
  await page.waitForFunction(() => {
    const label = Array.from(document.querySelectorAll('label')).find(el => (el.textContent || '').includes('Description'));
    const textarea = label?.querySelector('textarea');
    return Boolean(textarea && textarea.value.trim().length > 0 && !textarea.value.includes('AUDIT_CHAT_OVERRIDE_MARKER'));
  });
  assert.doesNotMatch(await page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue(), /AUDIT_CHAT_OVERRIDE_MARKER/);
  await page.locator('header button').last().click();
  await closeDrawer();
  return 'override save/localStorage/reopen/reset';'''
if old not in s:
    raise SystemExit('override test block not found')
s = s.replace(old, new)

# Playwright's hasText() can match a label because of its textarea value. Use the
# accessible label name and the visible label span exactly for this test.
s = s.replace(
    "const desc = page.locator('label').filter({ hasText: 'Description' }).locator('textarea');",
    "const desc = page.getByRole('textbox', { name: 'Description', exact: true });"
)
s = s.replace(
    "page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue()",
    "page.getByRole('textbox', { name: 'Description', exact: true }).inputValue()"
)
s = s.replace(
    "const label = Array.from(document.querySelectorAll('label')).find(el => (el.textContent || '').includes('Description'));",
    "const label = Array.from(document.querySelectorAll('label')).find(el => (el.querySelector('span')?.textContent || '').trim() === 'Description');"
)

# Wait for the import modal's documented delayed close instead of assuming a fixed
# sleep is always enough on a busy CI/browser runner.
s = s.replace(
    "  await page.getByRole('button', { name: 'Karte importieren' }).click();\n  await page.waitForTimeout(1500);",
    "  await page.getByRole('button', { name: 'Karte importieren' }).click();\n  await page.locator('#import-export-modal').waitFor({ state: 'detached', timeout: 8000 });"
)
s = s.replace(
    "  await backupInput.setInputFiles(backupPath);\n  await page.waitForTimeout(1600);",
    "  await backupInput.setInputFiles(backupPath);\n  await page.locator('#import-export-modal').waitFor({ state: 'detached', timeout: 8000 });"
)
s = s.replace(
    "  await modal.getByRole('button', { name: 'Chat ersetzen' }).click();\n  await page.waitForTimeout(1500);",
    "  await modal.getByRole('button', { name: 'Chat ersetzen' }).click();\n  await page.locator('#import-export-modal').waitFor({ state: 'detached', timeout: 8000 });"
)

# Record each failure, then recover only obstructing transient UI so one failed
# assertion cannot turn every later independent test into a false cascade.
old = '''    failures.push({ name, detail });
    console.log(`❌ ${name} — ${detail}`);
  }
}'''
new = '''    failures.push({ name, detail });
    console.log(`❌ ${name} — ${detail}`);
    try {
      const importClose = page.locator('#import-export-modal button[title="Schliessen"]');
      if (await importClose.count() && await importClose.first().isVisible()) await importClose.first().click({ timeout: 1500 });
      const drawerClose = page.locator('#chat-menu-drawer-content button[title="Schliessen"]');
      if (await drawerClose.count() && await drawerClose.first().isVisible()) await drawerClose.first().click({ timeout: 1500 });
    } catch {}
  }
}'''
if old not in s:
    raise SystemExit('test failure recovery block not found')
s = s.replace(old, new, 1)

p.write_text(s)
