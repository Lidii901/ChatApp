from pathlib import Path


def replace_if_needed(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Expected block not found in {path}')
    file.write_text(text.replace(old, new, 1))


replace_if_needed(
    'src/App.tsx',
    """          currentSummary: activeChat.storyContext.sceneSummary,\n          keyEvents: activeChat.storyContext.keyEvents,\n          language: activeChat.language || 'de',""",
    """          currentSummary: activeChat.storyContext.sceneSummary,\n          keyEvents: activeChat.storyContext.keyEvents,\n          language: activeChat.language || 'de',\n          settings,""",
)

old_impersonation = "Write {{user}}'s next response based only on the established conversation, scenario, user profile/persona and chat memory. Match {{user}}'s established writing style and perspective. Do not write actions, dialogue, thoughts or decisions for {{char}}. Do not invent prior meetings, relationship history, names, memories, knowledge or familiarity that are not established in the available context."
new_impersonation = "Write {{user}}'s next response based only on the established conversation, scenario, user profile/persona and chat memory. Match {{user}}'s established writing style and perspective. Do not write actions, dialogue, thoughts or decisions for the other character. Do not invent prior meetings, relationship history, names, memories, knowledge or familiarity that are not established in the available context."
replace_if_needed('src/utils/contextManager.ts', old_impersonation, new_impersonation)
replace_if_needed('server.ts', old_impersonation, new_impersonation)

print('Chub parity completion patch applied')
