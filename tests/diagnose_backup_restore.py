from pathlib import Path

p = Path('tests/uiMockAcceptance.mjs')
s = p.read_text()

old = """  await backupInput.setInputFiles(backupPath);
  await page.locator('#import-export-modal').waitFor({ state: 'detached', timeout: 8000 });"""
new = """  await backupInput.setInputFiles(backupPath);
  await page.waitForTimeout(1500);
  const restoreModal = page.locator('#import-export-modal');
  if (await restoreModal.count()) {
    const modalText = ((await restoreModal.textContent()) || '').replace(/\\s+/g, ' ').slice(0, 1600);
    const persisted = await page.evaluate(() => {
      const read = (key) => {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); }
        catch { return '__PARSE_ERROR__'; }
      };
      return {
        characters: read('rp_characters_v2'),
        chats: read('rp_chat_sessions_v2'),
        activeCharacterId: localStorage.getItem('rp_active_char_id_v2'),
        activeChatId: localStorage.getItem('rp_active_chat_id_v2'),
      };
    });
    const characterNames = Array.isArray(persisted.characters)
      ? persisted.characters.map((character) => character?.name)
      : persisted.characters;
    const importedStillStored = Array.isArray(persisted.characters)
      ? persisted.characters.some((character) => character?.name === 'Audit Imported Card')
      : null;
    throw new Error(`BACKUP_RESTORE_DIAG modal=${JSON.stringify(modalText)} importedStillStored=${importedStillStored} activeCharacterId=${persisted.activeCharacterId} activeChatId=${persisted.activeChatId} characterNames=${JSON.stringify(characterNames)}`);
  }"""

if old not in s:
    raise SystemExit('patched backup restore wait block not found')

p.write_text(s.replace(old, new, 1))
