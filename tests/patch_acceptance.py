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

# ChatSettingsModal is opened on top of the drawer. Closing/saving that modal
# intentionally reveals the still-open drawer, so the test must close the drawer
# before trying the header button again.
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

old = '''  await desc.fill(`${base}\\nAUDIT_CHAT_OVERRIDE_MARKER`);
  await page.getByRole('button', { name: 'Übernehmen' }).click();

  await page.locator('#header-menu-drawer-btn').click();'''
new = '''  await desc.fill(`${base}\\nAUDIT_CHAT_OVERRIDE_MARKER`);
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await closeDrawer();

  await page.locator('#header-menu-drawer-btn').click();'''
if old not in s:
    raise SystemExit('override first save block not found')
s = s.replace(old, new)

old = '''  await page.getByRole('button', { name: /Basis/ }).click();
  await page.getByRole('button', { name: 'Übernehmen' }).click();

  await page.locator('#header-menu-drawer-btn').click();'''
new = '''  await page.getByRole('button', { name: /Basis/ }).click();
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await closeDrawer();

  await page.locator('#header-menu-drawer-btn').click();'''
if old not in s:
    raise SystemExit('override reset block not found')
s = s.replace(old, new)

old = '''  assert.doesNotMatch(await page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue(), /AUDIT_CHAT_OVERRIDE_MARKER/);
  await page.locator('header button').last().click();
  return 'override save/reopen/reset';'''
new = '''  assert.doesNotMatch(await page.locator('label').filter({ hasText: 'Description' }).locator('textarea').inputValue(), /AUDIT_CHAT_OVERRIDE_MARKER/);
  await page.locator('header button').last().click();
  await closeDrawer();
  return 'override save/reopen/reset';'''
if old not in s:
    raise SystemExit('override final close block not found')
s = s.replace(old, new)

p.write_text(s)
