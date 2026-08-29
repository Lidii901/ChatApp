from pathlib import Path

app = Path('src/App.tsx')
s = app.read_text()

old = '''      <ChatMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        character={activeCharacter}
        activeChat={activeChat}'''
new = '''      <ChatMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        character={activeCharacter}
        baseCharacter={baseCharacter}
        activeChat={activeChat}'''
if old not in s:
    raise SystemExit('ChatMenuDrawer props block not found')
s = s.replace(old, new, 1)

old = '''        onOpenCharacterEditor={() => {
          setEditingCharacter(activeCharacter);
          setIsEditorModalOpen(true);
        }}'''
new = '''        onOpenCharacterEditor={() => {
          setEditingCharacter(baseCharacter);
          setIsEditorModalOpen(true);
        }}'''
if old not in s:
    raise SystemExit('drawer character editor handler not found')
s = s.replace(old, new, 1)

old = '''        onOpenEdit={() => {
          setEditingCharacter(activeCharacter);
          setIsEditorModalOpen(true);
        }}'''
new = '''        onOpenEdit={() => {
          setEditingCharacter(baseCharacter);
          setIsEditorModalOpen(true);
        }}'''
if old not in s:
    raise SystemExit('profile edit handler not found')
s = s.replace(old, new, 1)

app.write_text(s)

drawer = Path('src/components/ChatMenuDrawer.tsx')
s = drawer.read_text()

old = '''  character: Character;
  activeChat: ChatSession;'''
new = '''  character: Character;
  baseCharacter: Character;
  activeChat: ChatSession;'''
if old not in s:
    raise SystemExit('drawer interface character block not found')
s = s.replace(old, new, 1)

old = '''  character,
  activeChat,'''
new = '''  character,
  baseCharacter,
  activeChat,'''
if old not in s:
    raise SystemExit('drawer destructuring block not found')
s = s.replace(old, new, 1)

old = '''                    <p className="text-[10px] text-zinc-500">Titel, Dominanz & Rollen für diesen Chat</p>'''
new = '''                    <p className="text-[10px] text-zinc-500">Character Overrides, Sprache & Memory für diesen Chat</p>'''
if old not in s:
    raise SystemExit('stale chat settings helper copy not found')
s = s.replace(old, new, 1)

old = '''          baseCharacter={character}'''
new = '''          baseCharacter={baseCharacter}'''
if old not in s:
    raise SystemExit('ChatSettingsModal baseCharacter prop not found')
s = s.replace(old, new, 1)

drawer.write_text(s)
