from pathlib import Path

app_path = Path('src/App.tsx')
text = app_path.read_text()
old = """          currentSummary: activeChat.storyContext.sceneSummary,\n          keyEvents: activeChat.storyContext.keyEvents,\n          language: activeChat.language || 'de',"""
new = """          currentSummary: activeChat.storyContext.sceneSummary,\n          keyEvents: activeChat.storyContext.keyEvents,\n          language: activeChat.language || 'de',\n          settings,"""
if new not in text:
    if old not in text:
        raise SystemExit('Expected summarize request block not found in src/App.tsx')
    app_path.write_text(text.replace(old, new, 1))

print('Chub parity completion patch applied')
