from pathlib import Path

server_path = Path('server.ts')
server = server_path.read_text()
old = "  const configuredPrompt = applyPromptMacros(impersonationPrompt || DEFAULT_IMPERSONATION_PROMPT, values).trim();"
new = "  const impersonationMacroValues = {\n    ...values,\n    char: language === 'de' ? 'die andere Figur' : 'the other character',\n  };\n  const configuredPrompt = applyPromptMacros(impersonationPrompt || DEFAULT_IMPERSONATION_PROMPT, impersonationMacroValues).trim();"
if new not in server:
    if old not in server:
        raise SystemExit('Configured impersonation prompt line not found')
    server = server.replace(old, new, 1)
server_path.write_text(server)

test_path = Path('tests/imitateKnowledge.test.ts')
test = test_path.read_text()
old_test = "assert.match(englishSystem, /Don't describe actions of SECRET_TECHNICAL_NAME/i);"
new_test = "assert.match(englishSystem, /Don't describe actions of the other character/i);"
if new_test not in test:
    if old_test not in test:
        raise SystemExit('Chub impersonation assertion not found')
    test = test.replace(old_test, new_test, 1)
test_path.write_text(test)

print('Protected Imitate Me from technical character-name leakage in Chub impersonation macros.')
