from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


replace_exact(
    "src/utils/contextManager.ts",
    """export const DEFAULT_SETTINGS: ModelSettings = {\n  provider: 'openrouter',\n  modelName: '',\n  temperature: 0.88,\n  maxOutputTokens: 2200,\n  contextWindowSize: 14,\n};""",
    """export const DEFAULT_SETTINGS: ModelSettings = {\n  provider: 'openrouter',\n  modelName: '',\n  temperature: 0.88,\n  maxOutputTokens: 2200,\n  contextSizeTokens: 32768,\n  topP: 1,\n  frequencyPenalty: 0,\n  presencePenalty: 0,\n  repetitionPenalty: 1,\n  promptNote: '',\n  promptNoteDepth: 1,\n  promptNoteRole: 'system',\n  assistantPrefill: '',\n  impersonationPrompt: '',\n};""",
)

replace_exact(
    "src/utils/contextManager.ts",
    """      return {\n        ...DEFAULT_SETTINGS,\n        ...parsed,\n        provider: 'openrouter',\n      };""",
    """      const legacyContextValue = Number(parsed.contextWindowSize);\n      const parsedContextTokens = Number(parsed.contextSizeTokens);\n      const contextSizeTokens = Number.isFinite(parsedContextTokens) && parsedContextTokens >= 2048\n        ? parsedContextTokens\n        : Number.isFinite(legacyContextValue) && legacyContextValue >= 2048\n          ? legacyContextValue\n          : DEFAULT_SETTINGS.contextSizeTokens;\n      return {\n        ...DEFAULT_SETTINGS,\n        ...parsed,\n        contextSizeTokens,\n        provider: 'openrouter',\n      };""",
)

replace_exact(
    "src/App.tsx",
    """          currentSummary: activeChat.storyContext.sceneSummary,\n          keyEvents: activeChat.storyContext.keyEvents,\n          language: activeChat.language || 'de',""",
    """          currentSummary: activeChat.storyContext.sceneSummary,\n          keyEvents: activeChat.storyContext.keyEvents,\n          language: activeChat.language || 'de',\n          settings,""",
)

print("Chub parity completion patch applied")
