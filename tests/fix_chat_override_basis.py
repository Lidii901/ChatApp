from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'{label} not found in {path}')
    p.write_text(s.replace(old, new, 1))


# 1) Deleting the active chat must always leave the chat view and return to the list.
replace_once(
    'src/App.tsx',
    '''  const handleDeleteChat = (chatId: string) => {
    const filtered = chats.filter((c) => c.id !== chatId);
    setChats(filtered);
    if (activeChatId === chatId) {
      if (filtered.length > 0) {
        setActiveChatId(filtered[0].id);
        setActiveCharacterId(filtered[0].characterId);
      } else {
        setActiveChatId('');
        setCurrentView('main');
        setActiveTab('chats');
      }
    }
  };''',
    '''  const handleDeleteChat = (chatId: string) => {
    const filtered = chats.filter((c) => c.id !== chatId);
    setChats(filtered);

    // A deleted chat must not leave stale background-job state attached to the UI.
    loadPendingJobs()
      .filter((job) => job.chatId === chatId)
      .forEach((job) => removePendingJob(job.id));

    if (activeChatId === chatId) {
      const fallbackChat = filtered[0];
      if (fallbackChat) {
        setActiveChatId(fallbackChat.id);
        setActiveCharacterId(fallbackChat.characterId);
      } else {
        setActiveChatId('');
      }

      setActiveChatJobId(null);
      setActiveImitateJobId(null);
      setActivePhotoJobId(null);
      setIsGenerating(false);
      setIsImitating(false);
      setIsPhotoJobRunning(false);
      setIsMenuDrawerOpen(false);
      setCurrentView('main');
      setActiveTab('chats');
    }
  };''',
    'active-chat delete handler',
)

# 2) A full backup restore is a state replacement. Close the modal immediately,
# select a consistent restored chat/character pair and return to the chat list.
replace_once(
    'src/App.tsx',
    '''        onRestoreFullBackup={(data) => {
          if (data.characters && data.characters.length > 0) {
            const normalized = data.characters.map(normalizeLegacyCharacterToV2);
            setCharacters(normalized);
            setActiveCharacterId(normalized[0].id);
          }
          if (data.chats && data.chats.length > 0) {
            setChats(data.chats);
            setActiveChatId(data.chats[0].id);
          }
          if (data.settings) setSettings(data.settings);
          setTimeout(() => scrollToBottom(), 100);
        }}''',
    '''        onRestoreFullBackup={(data) => {
          const normalizedCharacters = data.characters && data.characters.length > 0
            ? data.characters.map(normalizeLegacyCharacterToV2)
            : undefined;
          const restoredChats = data.chats && data.chats.length > 0 ? data.chats : undefined;

          if (normalizedCharacters) setCharacters(normalizedCharacters);
          if (restoredChats) setChats(restoredChats);
          if (data.settings) setSettings(data.settings);

          const restoredChat = restoredChats?.[0];
          const restoredCharacterId = restoredChat?.characterId || normalizedCharacters?.[0]?.id;
          if (restoredChat) setActiveChatId(restoredChat.id);
          else if (restoredChats) setActiveChatId('');
          if (restoredCharacterId) setActiveCharacterId(restoredCharacterId);

          setActiveChatJobId(null);
          setActiveImitateJobId(null);
          setActivePhotoJobId(null);
          setIsGenerating(false);
          setIsImitating(false);
          setIsPhotoJobRunning(false);
          setErrorMessage(null);
          setIsImportExportModalOpen(false);
          setCurrentView('main');
          setActiveTab('chats');
        }}''',
    'full-backup restore callback',
)

# 3) The current /photo endpoint generates text, not pixels. Keep the technical
# endpoint/job name for compatibility, but make every visible message truthful.
app = Path('src/App.tsx')
s = app.read_text()
for old, new in [
    ('`${charObj.name} hat ein Foto gesendet`', '`${charObj.name} hat einen Szenenmoment gesendet`'),
    ("job.error || 'Foto-Generierung fehlgeschlagen.'", "job.error || 'Szenenmoment-Generierung fehlgeschlagen.'"),
    ("data.error || 'Fehler beim Starten der Foto-Generierung.'", "data.error || 'Fehler beim Starten des Szenenmoment-Jobs.'"),
    ("err.message || 'Konnte kein Foto anfordern.'", "err.message || 'Konnte keinen Szenenmoment anfordern.'"),
]:
    if old not in s:
        raise SystemExit(f'photo-facing App copy not found: {old}')
    s = s.replace(old, new, 1)
app.write_text(s)

# Drawer: remove the camera promise and explain explicitly that this is text only.
drawer = Path('src/components/ChatMenuDrawer.tsx')
s = drawer.read_text()
for old, new in [
    ('  Camera,\n', '  Sparkles,\n'),
    ('<Camera className="h-4 w-4 text-rose-400" />', '<Sparkles className="h-4 w-4 text-rose-400" />'),
    ('Foto anfordern', 'Szenenmoment'),
    ('<span className="text-[10px] text-rose-400/80 uppercase font-semibold">Situativ</span>', '<span className="text-[10px] text-rose-400/80 uppercase font-semibold">Text</span>'),
    ('Lass {character.name} ein passendes situatives Foto in den aktuellen Chat senden.', 'Lass {character.name} eine kurze, zur aktuellen Situation passende Nachricht senden. Es wird kein Bild generiert.'),
    ('<Camera className="h-3.5 w-3.5" />', '<Sparkles className="h-3.5 w-3.5" />'),
    ('Foto jetzt senden lassen', 'Szenenmoment senden lassen'),
]:
    if old not in s:
        raise SystemExit(f'scene-moment drawer copy not found: {old}')
    s = s.replace(old, new, 1)
drawer.write_text(s)

# Character editor: the legacy imageFrequency/imageStyleDescription controls are
# app controls, but they currently drive the text-only scene-moment endpoint.
editor = Path('src/components/CharacterEditorModal.tsx')
s = editor.read_text()
for old, new in [
    ('Situative Bilder (App-Funktion)', 'Situative Szenenmomente (App-Funktion)'),
    ('Diese Felder gehören nicht zur Character Card V2 und steuern nur die Bildfunktion der App.', 'Diese Felder gehören nicht zur Character Card V2 und steuern nur die textliche Szenenmoment-Funktion der App. Es wird kein Bild generiert.'),
    ('placeholder="Bildstil / Look"', 'placeholder="Stil / Fokus des Szenenmoments"'),
]:
    if old not in s:
        raise SystemExit(f'scene-moment editor copy not found: {old}')
    s = s.replace(old, new, 1)
editor.write_text(s)

# Server prompt: never tell the model it sent an image when the endpoint only
# returns a text message. Keep route/job identifiers stable for existing clients.
server = Path('server.ts')
s = server.read_text()
for old, new in [
    ('`Situative Bilder sind für ${charName} deaktiviert.`', '`Situative Szenenmomente sind für ${charName} deaktiviert.`'),
    ('`Du bist die Figur ${charName}. Du schickst ${playerAddress} ein situatives Bild oder Detail deiner aktuellen Umgebung bzw. deines Looks. Schreibe eine kurze Begleitnachricht (1-3 Sätze) passend zur Character Card.`', '`Du bist die Figur ${charName}. Schreibe für ${playerAddress} einen kurzen situativen Szenenmoment oder ein Detail deiner aktuellen Umgebung bzw. deines Looks. Die Ausgabe ist ausschliesslich textlich: Behaupte nicht, dass du ein echtes Bild oder Foto gesendet hast. Schreibe 1-3 Sätze passend zur Character Card.`'),
    ('`You are ${charName}. You are sending ${playerAddress} a situational snapshot or detail of the current surroundings/appearance. Write a short accompanying message (1-3 sentences) consistent with the Character Card.`', '`You are ${charName}. Write ${playerAddress} a short situational scene moment or detail of the current surroundings/appearance. The output is text only: do not claim that you sent a real image or photo. Write 1-3 sentences consistent with the Character Card.`'),
    ("job.error = error.message || 'Fehler beim Generieren der situativen Nachricht.';", "job.error = error.message || 'Fehler beim Generieren des Szenenmoments.';"),
    ("res.status(500).json({ error: error.message || 'Fehler beim Starten des Photo-Jobs.' });", "res.status(500).json({ error: error.message || 'Fehler beim Starten des Szenenmoment-Jobs.' });"),
]:
    if old not in s:
        raise SystemExit(f'scene-moment server copy not found: {old}')
    s = s.replace(old, new, 1)
server.write_text(s)
