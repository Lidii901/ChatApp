from pathlib import Path

# 1) Keep StoryContext/currentScene internal but stop rendering it in the chat UI.
app_path = Path('src/App.tsx')
app = app_path.read_text()
scene_block = '''              {activeChat.storyContext?.currentScene && (\n                <div className="my-2.5 mx-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-center text-[11px] text-zinc-400">\n                  <span className="font-semibold text-zinc-300">Szene: </span>\n                  {activeChat.storyContext.currentScene}\n                </div>\n              )}\n\n'''
assert scene_block in app, 'Visible scene block not found in App.tsx'
app = app.replace(scene_block, '', 1)
app_path.write_text(app)

# 2) Make currentScene prompt-effective for normal character replies while keeping
# it separate from Chat Memory/summary semantics.
prompt_path = Path('src/utils/promptBuilder.ts')
prompt = prompt_path.read_text()
memory_function = """function buildChatMemory(storyContext: any): string {\n  const summary = String(storyContext?.sceneSummary || '').trim();\n  if (!summary) return '';\n  return `Chat Memory:\\n${summary}`;\n}\n"""
scene_and_memory_functions = """function buildCurrentScene(storyContext: any): string {\n  const currentScene = String(storyContext?.currentScene || '').trim();\n  if (!currentScene) return '';\n  return `Current Scene:\\n${currentScene}`;\n}\n\nfunction buildChatMemory(storyContext: any): string {\n  const summary = String(storyContext?.sceneSummary || '').trim();\n  if (!summary) return '';\n  return `Chat Memory:\\n${summary}`;\n}\n"""
assert memory_function in prompt, 'Chat Memory function marker not found'
prompt = prompt.replace(memory_function, scene_and_memory_functions, 1)
context_marker = """  const chatMemory = containsMacro(character, 'summary') ? '' : buildChatMemory(storyContext);\n  const languageGuard = finalLanguageGuard(language);\n  const systemContent = [systemPrompt, beforeLore, characterDefinitions, afterLore, chatMemory, languageGuard].filter(Boolean).join('\\n\\n');\n"""
context_replacement = """  const currentScene = buildCurrentScene(storyContext);\n  const chatMemory = containsMacro(character, 'summary') ? '' : buildChatMemory(storyContext);\n  const languageGuard = finalLanguageGuard(language);\n  const systemContent = [systemPrompt, beforeLore, characterDefinitions, afterLore, currentScene, chatMemory, languageGuard].filter(Boolean).join('\\n\\n');\n"""
assert context_marker in prompt, 'System context assembly marker not found'
prompt = prompt.replace(context_marker, context_replacement, 1)
prompt_path.write_text(prompt)

# 3) Strengthen only Dean's existing CCv2 post_history_instructions.
# This does not change his canon or add a parallel prompt system; it makes the
# already-present initiative requirement unambiguous for the model.
default_path = Path('src/data/defaultCharacters.ts')
defaults = default_path.read_text()
old_initiative = "Dean must be an active participant. He takes initiative, changes position, engineers proximity, follows, leaves and reappears, introduces plausible situations or other characters when coherent, and moves the story forward rather than repeatedly asking {{user}} what happens next. Keep the stalker/obsessive core present:"
new_initiative = "Dean must be an active participant. He takes initiative, changes position, engineers proximity, follows, leaves and reappears, introduces plausible situations or other characters when coherent, and moves the story forward rather than repeatedly asking {{user}} what happens next. Do not substitute questions, offers, permission-seeking or waiting for an answer for initiative. A question or offer may appear in dialogue, but Dean must still make his own concrete next move in the same reply instead of ending by handing control back to {{user}}. Avoid repeatedly ending on an open offer, choice or invitation for {{user}} to decide what happens next. Keep the stalker/obsessive core present:"
assert old_initiative in defaults, 'Current bundled Dean initiative text not found'
defaults = defaults.replace(old_initiative, new_initiative, 1)
default_path.write_text(defaults)

# 4) Narrow migration for already-saved copies of the bundled Dean card.
normalizer_path = Path('src/utils/characterNormalizer.ts')
normalizer = normalizer_path.read_text()
anchor = "const OLD_DEAN_EXAMPLE_ACTION =\n"
constants = """const BUNDLED_DEAN_INITIATIVE_V1 =\n  'Dean must be an active participant. He takes initiative, changes position, engineers proximity, follows, leaves and reappears, introduces plausible situations or other characters when coherent, and moves the story forward rather than repeatedly asking {{user}} what happens next. Keep the stalker/obsessive core present:';\nconst BUNDLED_DEAN_INITIATIVE_V2 =\n  'Dean must be an active participant. He takes initiative, changes position, engineers proximity, follows, leaves and reappears, introduces plausible situations or other characters when coherent, and moves the story forward rather than repeatedly asking {{user}} what happens next. Do not substitute questions, offers, permission-seeking or waiting for an answer for initiative. A question or offer may appear in dialogue, but Dean must still make his own concrete next move in the same reply instead of ending by handing control back to {{user}}. Avoid repeatedly ending on an open offer, choice or invitation for {{user}} to decide what happens next. Keep the stalker/obsessive core present:';\n\n"""
assert anchor in normalizer, 'Normalizer constant anchor not found'
normalizer = normalizer.replace(anchor, constants + anchor, 1)
replace_anchor = "  cleaned = replaceKnown(cleaned, PREVIOUS_DEAN_POST_HISTORY, NEW_DEAN_POST_HISTORY);\n"
replace_line = replace_anchor + "  cleaned = replaceKnown(cleaned, BUNDLED_DEAN_INITIATIVE_V1, BUNDLED_DEAN_INITIATIVE_V2);\n"
assert replace_anchor in normalizer, 'Normalizer replacement anchor not found'
normalizer = normalizer.replace(replace_anchor, replace_line, 1)
normalizer_path.write_text(normalizer)

# 5) Regression coverage for the narrow bundled-card migration.
legacy_test_path = Path('tests/legacyCharacterMigration.test.ts')
legacy_test = legacy_test_path.read_text()
insert_anchor = "const unrelatedCharacter = { ...oldDean, id: 'some-other-dean' };\n"
regression = """const bundledDeanInitiativeV1 = 'Dean must be an active participant. He takes initiative, changes position, engineers proximity, follows, leaves and reappears, introduces plausible situations or other characters when coherent, and moves the story forward rather than repeatedly asking {{user}} what happens next. Keep the stalker/obsessive core present:';\nconst bundledDean: any = { ...directV2, id: 'char-dean', name: 'Dean', postHistoryInstructions: bundledDeanInitiativeV1 };\nconst upgradedBundledDean = migrateKnownDefaultCharacterArtifacts(bundledDean);\nassert.match(upgradedBundledDean.postHistoryInstructions || '', /Do not substitute questions, offers, permission-seeking or waiting for an answer for initiative/);\nassert.match(upgradedBundledDean.postHistoryInstructions || '', /Dean must still make his own concrete next move in the same reply/);\n\n"""
assert insert_anchor in legacy_test, 'Legacy test insertion anchor not found'
legacy_test = legacy_test.replace(insert_anchor, regression + insert_anchor, 1)
legacy_test_path.write_text(legacy_test)

# 6) Regression coverage that currentScene is included in the real normal-chat
# system context even though it is no longer rendered as a chat card.
parity_path = Path('tests/chubParityRegression.test.ts')
parity = parity_path.read_text()
story_context_old = "  storyContext: { profile: 'PLAYER_PROFILE', sceneSummary: 'SUMMARY' },\n"
story_context_new = "  storyContext: { profile: 'PLAYER_PROFILE', currentScene: 'CURRENT_SCENE', sceneSummary: 'SUMMARY' },\n"
assert story_context_old in parity, 'Parity storyContext marker not found'
parity = parity.replace(story_context_old, story_context_new, 1)
assertion_anchor = "assert.equal(configPayload.assistantPrefill, 'PREFILL:');\n"
scene_assertion = assertion_anchor + "assert.match(configPayload.messages[0].content, /Current Scene:\\nCURRENT_SCENE/);\n"
assert assertion_anchor in parity, 'Parity assertion anchor not found'
parity = parity.replace(assertion_anchor, scene_assertion, 1)
parity_path.write_text(parity)

# Structural checks.
assert scene_block not in app, 'Visible Scene card is still rendered in App.tsx'
assert 'function buildCurrentScene(storyContext: any)' in prompt, 'currentScene is not prompt-effective in promptBuilder.ts'
