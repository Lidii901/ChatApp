from pathlib import Path

server_path = Path('server.ts')
server = server_path.read_text()

perspective_marker = """  const perspectiveRule = examples
    ? (language === 'de'
        ? 'PERSPEKTIVE: Übernimm die in den Stilbeispielen tatsächlich etablierte Perspektive der Spielerfigur.'
        : 'PERSPECTIVE: Match the player perspective actually established by the style examples.')
    : (language === 'de'
        ? 'PERSPEKTIVE: Es gibt noch keine Stilbeispiele der Spielerfigur. Verwende standardmässig die erste Person Singular (ich/mein/mir/mich) und erzähle die Spielerfigur NICHT in der dritten Person.'
        : 'PERSPECTIVE: There are no player writing-style examples yet. Default to first-person singular (I/my/me) and do NOT narrate the player character in third person.');

  return [
"""
continuation_marker = """  const perspectiveRule = examples
    ? (language === 'de'
        ? 'PERSPEKTIVE: Übernimm die in den Stilbeispielen tatsächlich etablierte Perspektive der Spielerfigur.'
        : 'PERSPECTIVE: Match the player perspective actually established by the style examples.')
    : (language === 'de'
        ? 'PERSPEKTIVE: Es gibt noch keine Stilbeispiele der Spielerfigur. Verwende standardmässig die erste Person Singular (ich/mein/mir/mich) und erzähle die Spielerfigur NICHT in der dritten Person.'
        : 'PERSPECTIVE: There are no player writing-style examples yet. Default to first-person singular (I/my/me) and do NOT narrate the player character in third person.');
  const continuationRule = language === 'de'
    ? 'FORTSETZUNG: Schreibe einen neuen Spielerzug, der auf den bisherigen Chat reagiert und die Szene aus Sicht der Spielerfigur fortsetzt. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht der Spielerfigur um. Wiederhole Details daraus nur, wenn die neue Handlung oder die neuen Worte der Spielerfigur direkt darauf reagieren.'
    : 'CONTINUATION: Write a new player turn that reacts to the chat so far and continues the scene from the player perspective. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from the player point of view. Reuse details from it only when the player’s new action or words directly respond to those details.';

  return [
"""
assert perspective_marker in server, 'Perspective marker not found'
server = server.replace(perspective_marker, continuation_marker, 1)

array_marker = """    evidenceSections,
    perspectiveRule,
    examples
"""
array_replacement = """    evidenceSections,
    perspectiveRule,
    continuationRule,
    examples
"""
assert array_marker in server, 'System prompt array marker not found'
server = server.replace(array_marker, array_replacement, 1)

last_char_block = """  const lastCharMsg = [...recentMessages].reverse().find(
    (message: any) => message.role !== 'lidii' && message.role !== 'user'
  );

"""
assert last_char_block in server, 'lastCharMsg declaration not found'
server = server.replace(last_char_block, '', 1)

last_char_append = """  if (lastCharMsg) {
    prompt += language === 'de'
      ? `[LETZTE AKTION/WORTE DER ANDEREN FIGUR]:\\n${lastCharMsg.content}\\n\\n`
      : `[OTHER CHARACTER'S LAST ACTION/WORDS]:\\n${lastCharMsg.content}\\n\\n`;
  }

"""
assert last_char_append in server, 'Duplicated last character message block not found'
server = server.replace(last_char_append, '', 1)

return_marker = """  return prompt;
}

function cleanEnvString"""
return_replacement = """  prompt += language === 'de'
    ? `\\n\\nFORTSETZUNG: Reagiere als ${playerAddress} auf den vorhandenen Verlauf und schreibe etwas Neues. Erzähle, paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT aus Sicht von ${playerAddress} um. Wiederhole ein Detail daraus nur, wenn ${playerAddress}s neue Handlung oder Worte direkt darauf reagieren.`
    : `\\n\\nCONTINUATION: React as ${playerAddress} to the existing history and write something new. Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message from ${playerAddress}'s point of view. Repeat a detail from it only when ${playerAddress}'s new action or words directly respond to that detail.`;
  return prompt;
}

function cleanEnvString"""
assert return_marker in server, 'buildImitateUserPrompt return marker not found'
server = server.replace(return_marker, return_replacement, 1)
server_path.write_text(server)

test_path = Path('tests/imitateKnowledge.test.ts')
test = test_path.read_text()

assertion_marker = """assert.match(englishUserPrompt, /already established physical scene state/i);

const styledSystem"""
assertion_replacement = """assert.match(englishUserPrompt, /already established physical scene state/i);
assert.match(englishSystem, /CONTINUATION: Write a new player turn/i);
assert.match(englishSystem, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);

const gatsbyCharacterTurn = 'The spine of The Great Gatsby presses into your palm as you slide it into place on the shelf.';
const gatsbyImitatePrompt = buildImitateUserPrompt(
  technicalOnlyCharacter,
  [{ role: 'character', content: gatsbyCharacterTurn }],
  'en',
  10
);
assert.equal(
  gatsbyImitatePrompt.split(gatsbyCharacterTurn).length - 1,
  1,
  'The latest CHARACTER message must appear only once in the Imitate Me input instead of being duplicated near the task instruction.'
);
assert.doesNotMatch(gatsbyImitatePrompt, /OTHER CHARACTER'S LAST ACTION\\/WORDS/i);
assert.match(gatsbyImitatePrompt, /React as Player to the existing history and write something new/i);
assert.match(gatsbyImitatePrompt, /Do NOT retell, paraphrase, mirror, summarize, or rewrite the previous CHARACTER message/i);

const styledSystem"""
assert assertion_marker in test, 'English assertion marker not found'
test = test.replace(assertion_marker, assertion_replacement, 1)

german_marker = """assert.match(germanSystem, /Bewahre bereits etablierte objektive Szenenzustände/i);

const loreSystem"""
german_replacement = """assert.match(germanSystem, /Bewahre bereits etablierte objektive Szenenzustände/i);
assert.match(germanSystem, /FORTSETZUNG: Schreibe einen neuen Spielerzug/i);
assert.match(germanSystem, /paraphrasiere, spiegle oder schreibe die letzte CHARACTER-Nachricht NICHT/i);

const loreSystem"""
assert german_marker in test, 'German assertion marker not found'
test = test.replace(german_marker, german_replacement, 1)
test_path.write_text(test)
