from pathlib import Path

server_path = Path('server.ts')
server = server_path.read_text()

continuation_marker = """  const continuationRule = language === 'de'
    ? 'FORTSETZUNG: Schreibe einen neuen Spielerzug, der auf den bisherigen Chat reagiert und die Szene aus Sicht der Spielerfigur fortsetzt. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht der Spielerfigur um. Wiederhole Details daraus nur, wenn die neue Handlung oder die neuen Worte der Spielerfigur direkt darauf reagieren.'
    : 'CONTINUATION: Write a new player turn that reacts to the chat so far and continues the scene from the player perspective. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from the player point of view. Reuse details from it only when the player’s new action or words directly respond to those details.';

  return [
"""
continuation_replacement = """  const continuationRule = language === 'de'
    ? 'FORTSETZUNG: Schreibe einen neuen Spielerzug, der auf den bisherigen Chat reagiert und die Szene aus Sicht der Spielerfigur fortsetzt. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht der Spielerfigur um. Wiederhole Details daraus nur, wenn die neue Handlung oder die neuen Worte der Spielerfigur direkt darauf reagieren.'
    : 'CONTINUATION: Write a new player turn that reacts to the chat so far and continues the scene from the player perspective. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from the player point of view. Reuse details from it only when the player’s new action or words directly respond to those details.';
  const focusRule = language === 'de'
    ? 'UMFANG UND FOKUS: Halte den Entwurf kurz: 2 bis 4 kurze Sätze oder RP-Einheiten. Baue die Szene nicht erneut auf und beschreibe Setting, Atmosphäre, Gegenstände oder die andere Figur nicht noch einmal, nur um den letzten CHARACTER-Text umzuschreiben. Verwende nur Details, die für die unmittelbare neue Handlung, Wahrnehmung oder Worte der Spielerfigur nötig sind. Verwandle reine Erzählerdetails aus einer CHARACTER-Nachricht nicht in neue Wahrnehmungen der Spielerfigur, wenn der bisherige Chat nicht belegt, dass sie diese tatsächlich wahrnehmen konnte.'
    : 'LENGTH AND FOCUS: Keep the draft brief: 2 to 4 short sentences or RP units. Do not restage the scene or redescribe the setting, atmosphere, objects, or the other character merely to rewrite the previous CHARACTER text. Use only details needed for the player’s immediate new action, perception, or words. Do not turn narrator-only details from a CHARACTER message into new player perceptions unless the chat establishes that the player could actually perceive them.';

  return [
"""
assert continuation_marker in server, 'Continuation marker not found'
server = server.replace(continuation_marker, continuation_replacement, 1)

array_marker = """    perspectiveRule,
    continuationRule,
    examples
"""
array_replacement = """    perspectiveRule,
    continuationRule,
    focusRule,
    examples
"""
assert array_marker in server, 'Prompt array marker not found'
server = server.replace(array_marker, array_replacement, 1)

user_marker = """  prompt += language === 'de'
    ? `\\n\\nFORTSETZUNG: Reagiere als ${playerAddress} auf den vorhandenen Verlauf und schreibe etwas Neues. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht von ${playerAddress} um. Wiederhole ein Detail daraus nur, wenn ${playerAddress}s neue Handlung oder Worte direkt darauf reagieren.`
    : `\\n\\nCONTINUATION: React as ${playerAddress} to the existing history and write something new. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from ${playerAddress}'s point of view. Repeat a detail from it only when ${playerAddress}'s new action or words directly respond to that detail.`;
  return prompt;
"""
user_replacement = """  prompt += language === 'de'
    ? `\\n\\nFORTSETZUNG: Reagiere als ${playerAddress} auf den vorhandenen Verlauf und schreibe etwas Neues. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht von ${playerAddress} um. Wiederhole ein Detail daraus nur, wenn ${playerAddress}s neue Handlung oder Worte direkt darauf reagieren.`
    : `\\n\\nCONTINUATION: React as ${playerAddress} to the existing history and write something new. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from ${playerAddress}'s point of view. Repeat a detail from it only when ${playerAddress}'s new action or words directly respond to that detail.`;
  prompt += language === 'de'
    ? `\\n\\nUMFANG UND FOKUS: Schreibe nur 2 bis 4 kurze Sätze oder RP-Einheiten. Baue Setting und Atmosphäre nicht erneut auf und beschreibe die andere Figur nicht erneut. Nutze nur Details, die ${playerAddress} für die unmittelbare neue Handlung, Wahrnehmung oder Worte braucht. Mache aus reinen Erzählerdetails der CHARACTER-Nachricht keine neue Wahrnehmung von ${playerAddress}, solange der Chat nicht belegt, dass ${playerAddress} sie tatsächlich wahrnehmen konnte.`
    : `\\n\\nLENGTH AND FOCUS: Write only 2 to 4 short sentences or RP units. Do not restage the setting or atmosphere and do not redescribe the other character. Use only details ${playerAddress} needs for the immediate new action, perception, or words. Do not turn narrator-only details from the CHARACTER message into a new perception by ${playerAddress} unless the chat establishes that ${playerAddress} could actually perceive them.`;
  return prompt;
"""
assert user_marker in server, 'User continuation marker not found'
server = server.replace(user_marker, user_replacement, 1)
server_path.write_text(server)

test_path = Path('tests/imitateKnowledge.test.ts')
test = test_path.read_text()

system_assertion_marker = """assert.match(englishSystem, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);

const gatsbyCharacterTurn"""
system_assertion_replacement = """assert.match(englishSystem, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);
assert.match(englishSystem, /Keep the draft brief: 2 to 4 short sentences or RP units/i);
assert.match(englishSystem, /Do not restage the scene/i);
assert.match(englishSystem, /narrator-only details from a CHARACTER message into new player perceptions/i);

const gatsbyCharacterTurn"""
assert system_assertion_marker in test, 'English system assertion marker not found'
test = test.replace(system_assertion_marker, system_assertion_replacement, 1)

user_assertion_marker = """assert.match(gatsbyImitatePrompt, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);

const styledSystem"""
user_assertion_replacement = """assert.match(gatsbyImitatePrompt, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);
assert.match(gatsbyImitatePrompt, /Write only 2 to 4 short sentences or RP units/i);
assert.match(gatsbyImitatePrompt, /Do not restage the setting or atmosphere/i);
assert.match(gatsbyImitatePrompt, /narrator-only details from the CHARACTER message/i);

const styledSystem"""
assert user_assertion_marker in test, 'English user assertion marker not found'
test = test.replace(user_assertion_marker, user_assertion_replacement, 1)

german_marker = """assert.match(germanSystem, /paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT/i);

const loreSystem"""
german_replacement = """assert.match(germanSystem, /paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT/i);
assert.match(germanSystem, /2 bis 4 kurze Sätze oder RP-Einheiten/i);
assert.match(germanSystem, /Baue die Szene nicht erneut auf/i);
assert.match(germanSystem, /reine Erzählerdetails aus einer CHARACTER-Nachricht/i);

const loreSystem"""
assert german_marker in test, 'German assertion marker not found'
test = test.replace(german_marker, german_replacement, 1)

test_path.write_text(test)
