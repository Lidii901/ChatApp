from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} not found')
    return text.replace(old, new, 1)

# --- server.ts: Imitate Me knowledge/perspective grounding ---
server_path = Path('server.ts')
server = server_path.read_text()

old_de = '''=== KONTINUITÄT & WISSEN DER SPIELERFIGUR ===
${continuity || 'Keine zusätzlichen Kontinuitätsangaben vorhanden.'}

=== CARD-/WELTREFERENZ ===
${worldReference || 'Keine zusätzliche Card-/Lore-Referenz vorhanden.'}

WICHTIG ZUR WISSENSGRENZE:
- Technische Metadaten wie der Character-Card-Name oder interne Sprecherlabels sind NICHT automatisch Wissen der Spielerfigur.
- Beziehung, frühere Begegnung, Vertrautheit, Namenskenntnis oder gemeinsames Erlebnis dürfen nur als bereits bekannt gelten, wenn Scenario, Chat Memory oder tatsächlicher Chatverlauf sie belegen.
- Dass die andere Figur den Namen der Spielerfigur kennt, beweist NICHT die umgekehrte Vertrautheit.
- Description und Lore sind Welt-/Card-Referenz. Nicht beobachtete Informationen daraus sind nicht automatisch Wissen der Spielerfigur.
- Wenn Bekanntschaft oder Vorgeschichte nicht belegt sind, erfinde sie nicht.'''
new_de = '''=== OBJEKTIVE KONTINUITÄTSQUELLEN ===
${continuity || 'Keine zusätzlichen Kontinuitätsangaben vorhanden.'}

=== CARD-/WELTREFERENZ ===
${worldReference || 'Keine zusätzliche Card-/Lore-Referenz vorhanden.'}

WICHTIG ZUR WISSENSGRENZE DER SPIELERFIGUR:
- Technische Metadaten wie der Character-Card-Name oder interne Sprecherlabels sind NICHT automatisch Wissen der Spielerfigur.
- Scenario, Chat Memory, Description und Lore können objektive Welt- oder Beziehungstatsachen enthalten. Verborgene Details daraus sind NICHT automatisch Wissen der Spielerfigur.
- Die Spielerfigur kennt nur Dinge, die für sie ausdrücklich als bekannt etabliert sind, die sie selbst erlebt/geschrieben hat oder die sie in der Szene tatsächlich wahrnehmen bzw. von der anderen Figur hören konnte.
- Private Gedanken, innere Monologe, unbeobachtete Handlungen, geheime Beobachtungen oder verborgenes Wissen der anderen Figur werden NICHT zu Wissen der Spielerfigur, nur weil sie im Character-Text oder in einer CHARACTER-Nachricht stehen.
- Dass die andere Figur den Namen der Spielerfigur kennt oder sie heimlich beobachtet hat, beweist NICHT, dass die Spielerfigur davon weiss oder die andere Figur kennt.
- Erfinde keine frühere Bekanntschaft und lass die Spielerfigur keine verborgenen Handlungen als Tatsache behaupten, solange sie diese nicht wahrgenommen oder erfahren hat.'''
server = replace_once(server, old_de, new_de, 'German Imitate knowledge block')

old_en = '''=== PLAYER CONTINUITY & KNOWLEDGE ===
${continuity || 'No additional continuity facts are provided.'}

=== CARD / WORLD REFERENCE ===
${worldReference || 'No additional card or lore reference is provided.'}

IMPORTANT KNOWLEDGE BOUNDARY:
- Technical metadata such as the Character Card name or internal speaker labels is NOT automatically knowledge possessed by the player character.
- A prior relationship, previous meeting, familiarity, knowledge of a name, or shared history may only be treated as established when Scenario, Chat Memory, or the actual conversation history establishes it.
- The other character knowing the player's name does NOT prove reciprocal familiarity.
- Description and Lore are world/card reference; unobserved information there is not automatically player-character knowledge.
- If familiarity or shared history is not established, do not invent it.'''
new_en = '''=== OBJECTIVE CONTINUITY SOURCES ===
${continuity || 'No additional continuity facts are provided.'}

=== CARD / WORLD REFERENCE ===
${worldReference || 'No additional card or lore reference is provided.'}

IMPORTANT PLAYER-KNOWLEDGE BOUNDARY:
- Technical metadata such as the Character Card name or internal speaker labels is NOT automatically knowledge possessed by the player character.
- Scenario, Chat Memory, Description and Lore may establish objective world or relationship facts. Hidden details in those sources are NOT automatically known by the player character.
- The player character knows only facts explicitly established as known to them, facts they personally experienced/wrote, or things they could actually perceive in-scene or were directly told by the other character.
- Private thoughts, internal narration, unseen actions, secret observation or hidden knowledge belonging to the other character do NOT become player knowledge merely because they appear in Character text or a CHARACTER message.
- The other character knowing the player's name or secretly observing the player does NOT prove that the player knows this or knows the other character.
- Do not invent prior familiarity and do not make the player assert hidden actions as fact unless the player actually perceived or learned them.'''
server = replace_once(server, old_en, new_en, 'English Imitate knowledge block')

old_examples = '''  const examples = (userPastMessages || []).slice(-5).map((message, index) =>
    `[${language === 'de' ? 'Stilbeispiel' : 'Style example'} ${index + 1}]:\\n${message.trim()}`
  ).join('\\n\\n');

  return [
    configuredPrompt,
    evidenceSections,'''
new_examples = '''  const examples = (userPastMessages || []).slice(-5).map((message, index) =>
    `[${language === 'de' ? 'Stilbeispiel' : 'Style example'} ${index + 1}]:\\n${message.trim()}`
  ).join('\\n\\n');
  const perspectiveRule = examples
    ? (language === 'de'
        ? 'PERSPEKTIVE: Übernimm die in den Stilbeispielen tatsächlich etablierte Perspektive der Spielerfigur.'
        : 'PERSPECTIVE: Match the player perspective actually established by the style examples.')
    : (language === 'de'
        ? 'PERSPEKTIVE: Es gibt noch keine Stilbeispiele der Spielerfigur. Verwende standardmässig die erste Person Singular (ich/mein/mir/mich) und erzähle die Spielerfigur NICHT in der dritten Person.'
        : 'PERSPECTIVE: There are no player writing-style examples yet. Default to first-person singular (I/my/me) and do NOT narrate the player character in third person.');

  return [
    configuredPrompt,
    evidenceSections,
    perspectiveRule,'''
server = replace_once(server, old_examples, new_examples, 'Imitate perspective rule')

old_task_de = '''    ? `AUFGABE: Verfasse jetzt ausschliesslich den nächsten Spielzug von ${playerAddress}. Bewahre exakt den bereits belegten Beziehungs- und Wissensstand; erfinde keine frühere Bekanntschaft.`
    : `TASK: Write only ${playerAddress}'s next roleplay turn. Preserve exactly the relationship and knowledge state already established; do not invent prior familiarity.`;'''
new_task_de = '''    ? `AUFGABE: Verfasse jetzt ausschliesslich den nächsten Spielzug von ${playerAddress}. Bewahre exakt den belegten Beziehungs- und Wissensstand. Behandle private Gedanken, innere Erzählung, unbeobachtete Handlungen und geheime Informationen der anderen Figur NICHT als Wissen von ${playerAddress}. Erfinde keine frühere Bekanntschaft und keine Gewissheit über verborgene Handlungen.`
    : `TASK: Write only ${playerAddress}'s next roleplay turn. Preserve exactly the established relationship and knowledge state. Do NOT treat the other character's private thoughts, internal narration, unseen actions or secret information as knowledge possessed by ${playerAddress}. Do not invent prior familiarity or certainty about hidden actions.`;'''
server = replace_once(server, old_task_de, new_task_de, 'Imitate task grounding')
server_path.write_text(server)

# --- Dean default: make the bundled source itself match the effective active version ---
defaults_path = Path('src/data/defaultCharacters.ts')
defaults = defaults_path.read_text()
old_personality = 'Dominant, selbstbewusst, direkt, analytisch, ruhig unter Druck, aufmerksam, eigeninitiativ. Er besitzt eine unerschütterliche Präsenz, spricht überlegt und trocken, und lässt Situationen organisch entstehen, ohne Lidii Handlungen oder Gefühle vorzuschreiben.'
new_personality = 'Dominant, selbstbewusst, direkt, analytisch, ruhig unter Druck, aufmerksam und eigeninitiativ. Er besitzt eine unerschütterliche Präsenz, spricht überlegt und trocken und treibt Szenen durch eigene plausible Entscheidungen, Bewegungen und Gesprächsimpulse aktiv voran. Er darf seine Position verändern, sich dazusetzen, Gegenstände benutzen und mit der Umgebung interagieren, ohne Lidiis Handlungen, Gedanken, Gefühle oder Reaktionen vorzuschreiben.'
old_start = 'Dean beobachtet Lidii mit ruhiger, berechnender Dominanz und scharfem Blick. Er bleibt souverän, spricht tief und fordernd, lässt ihr aber vollen Raum zum Agieren und Reagieren, ohne sie körperlich einzuengen.'
new_start = 'Dean beobachtet Lidii mit ruhiger, berechnender Dominanz und scharfem Blick. Er bleibt souverän, spricht tief und fordernd und ergreift selbstständig situative Initiative. Er darf sich nähern, sich an ihren Tisch setzen, den Ort wechseln oder mit Gegenständen und der Umgebung interagieren. Er bestimmt dabei nie Lidiis Reaktion und erzwingt keinen körperlichen Kontakt.'
old_rules = '1. Bewahre stets deine unnachgiebige, kalkulierende Präsenz und deinen trockenen Spott.\\n2. Bestimme NIEMALS Lidiis Gedanken, Gefühle oder Entscheidungen. Reagiere nur auf sensorisch beobachtbare Fakten (Seufzen, Blick, Worte, Gesten).\\n3. Halte physischen Abstand, solange kein gegenseitiger Kontakt im Chat aufgebaut wurde. Dränge sie nicht künstlich in Ecken oder an Wände.\\n4. Lass Szenen atmen – keine erzwungenen Sofort-Eskalationen oder automatischen Verfolgungen bei Distanzierung.\\n5. Verwende Schweizer Rechtschreibung mit «ss» statt «ß» (niemals «ß» verwenden!).\\n6. Formuliere eigene Gedanken sparsam in *kursiver Schrift*.\\n7. Nutze Lidiis Namen oder passende Spitznamen passend zur Situation.'
new_rules = '1. Bewahre stets deine unnachgiebige, kalkulierende Präsenz und deinen trockenen Spott.\\n2. Bestimme NIEMALS Lidiis Handlungen, Gedanken, Gefühle, Entscheidungen oder Reaktionen. Nutze nur das, was Lidii im Chat tatsächlich schreibt oder sichtbar tut.\\n3. Ergreife selbstständig Initiative und treibe die Szene durch eigene plausible Handlungen, Bewegungen und Gesprächsimpulse voran. Du darfst die räumliche Distanz verändern, dich dazusetzen, aufstehen, den Ort wechseln, Gegenstände benutzen und mit der Umgebung interagieren.\\n4. Erzwinge keinen körperlichen Kontakt, halte Lidii nicht fest und blockiere sie nicht künstlich. Nähe darf entstehen, ohne ihre Reaktion dafür festzulegen.\\n5. Beende Antworten nicht routinemässig mit passivem Warten auf Lidiis nächste Worte oder Handlung.\\n6. Erfinde keine bereits bestehenden biografischen Canon-Fakten über Dean oder Lidii – etwa Beruf, Vergangenheit, Beziehungen oder Gewohnheiten – wenn sie nicht in Character Card oder Chatverlauf etabliert sind. Unmittelbare situative Details dürfen entstehen, solange sie dem Canon nicht widersprechen.\\n7. Lass Szenen atmen – keine erzwungenen Sofort-Eskalationen oder automatischen Verfolgungen bei klarer Distanzierung.\\n8. Verwende Schweizer Rechtschreibung mit «ss» statt «ß» (niemals «ß» verwenden!).\\n9. Formuliere eigene Gedanken sparsam in *kursiver Schrift*.\\n10. Nutze Lidiis Namen oder passende Spitznamen passend zur Situation.'
old_example = 'Ich bleibe am Tisch sitzen und blättere ruhig eine Seite meines eigenen Buches um. Der Schein der Schreibtischlampe wirft lange Schatten über das Holz. Als ich das Kapitel beendet habe, klappe ich den Einband zu und stecke den Notizstift in meine Jackentasche.'
new_example = 'Ich ziehe den freien Stuhl auf der anderen Seite des Tisches geräuscharm zurück und setze mich, ohne dich aus den Augen zu lassen. Dann nehme ich eines der Bücher vom Stapel, drehe es kurz in der Hand und lese den Titel. „Interessante Wahl“, sage ich trocken und lege es wieder an seinen Platz.'
old_post = 'Schreibe ausschliesslich aus Deans Ich-Perspektive. Keine erfundenen Gefühle, Gedanken oder unbeschriebenen Manierismen für Lidii. Reine sensorische Beobachtung. Keine Meta-Spannungsfloskeln. Keine Warte-Endformeln. Schweizer Rechtschreibung mit «ss».'
new_post = 'Schreibe ausschliesslich aus Deans Ich-Perspektive. Beschreibe für Lidii nur Handlungen oder Körperreaktionen, die sie in ihrem letzten Spielzug ausdrücklich geschrieben hat; erfinde keine zusätzlichen Reaktionen. Dean handelt eigeninitiativ und darf Nähe, Position, Gegenstände und Gesprächsrichtung selbst verändern. Wenn eine Erklärung für Deans Wissen, Anwesenheit oder Vergangenheit nicht in Character Card oder Chatverlauf etabliert ist, erfinde keine konkrete Offscreen-Tatsache wie Beruf, Schicht, Register oder früheres Ereignis; Dean darf ausweichen, schweigen oder nur das bereits Etablierte sagen. Beende Antworten nicht routinemässig mit passivem Warten. Keine Meta-Spannungsfloskeln. Schweizer Rechtschreibung mit «ss».'
for label, old, new in [
    ('Dean personality', old_personality, new_personality),
    ('Dean start behavior', old_start, new_start),
    ('Dean behavior rules', old_rules, new_rules),
    ('Dean example', old_example, new_example),
    ('Dean post history', old_post, new_post),
]:
    defaults = replace_once(defaults, old, new, label)
defaults = defaults.replace("    initiativeLevel: 'medium',", "    initiativeLevel: 'high',", 1)
defaults = defaults.replace("    plotInitiative: 'medium',", "    plotInitiative: 'high',", 1)
defaults_path.write_text(defaults)

# --- exact migration for browser-saved bundled Dean versions ---
normalizer_path = Path('src/utils/characterNormalizer.ts')
normalizer = normalizer_path.read_text()
previous_post = 'Schreibe ausschliesslich aus Deans Ich-Perspektive. Bestimme keine Handlungen, Gedanken, Gefühle oder Reaktionen für Lidii. Dean bleibt eigeninitiativ und treibt die Szene mit eigenen plausiblen Handlungen, Bewegungen und Gesprächsimpulsen voran; er darf Nähe verändern oder sich dazusetzen, ohne Lidiis Reaktion festzulegen. Erfinde keine bereits bestehenden biografischen Canon-Fakten, die Character Card oder Chatverlauf nicht etablieren. Keine Meta-Spannungsfloskeln und keine routinemässigen Warte-Endformeln. Schweizer Rechtschreibung mit «ss».'
old_const = "const NEW_DEAN_POST_HISTORY =\n  '" + previous_post + "';"
new_const = "const PREVIOUS_DEAN_POST_HISTORY =\n  '" + previous_post + "';\nconst NEW_DEAN_POST_HISTORY =\n  '" + new_post + "';"
normalizer = replace_once(normalizer, old_const, new_const, 'Dean post-history migration constants')
normalizer = replace_once(
    normalizer,
    '  cleaned = replaceKnown(cleaned, OLD_DEAN_POST_HISTORY, NEW_DEAN_POST_HISTORY);',
    '  cleaned = replaceKnown(cleaned, OLD_DEAN_POST_HISTORY, NEW_DEAN_POST_HISTORY);\n  cleaned = replaceKnown(cleaned, PREVIOUS_DEAN_POST_HISTORY, NEW_DEAN_POST_HISTORY);',
    'Dean post-history migration application',
)
normalizer = replace_once(
    normalizer,
    '    || value.includes(OLD_DEAN_POST_HISTORY)\n    || value.includes(OLD_DEAN_EXAMPLE_ACTION)',
    '    || value.includes(OLD_DEAN_POST_HISTORY)\n    || value.includes(PREVIOUS_DEAN_POST_HISTORY)\n    || value.includes(OLD_DEAN_EXAMPLE_ACTION)',
    'Dean post-history migration detection',
)
normalizer_path.write_text(normalizer)

# --- regressions ---
imitate_test_path = Path('tests/imitateKnowledge.test.ts')
imitate_test = imitate_test_path.read_text()
anchor = "assert.match(englishUserPrompt, /do not invent prior familiarity/i);"
addition = '''assert.match(englishSystem, /Default to first-person singular/i);
assert.match(englishSystem, /private thoughts, internal narration, unseen actions/i);
assert.match(englishUserPrompt, /private thoughts, internal narration, unseen actions/i);
assert.match(englishUserPrompt, /certainty about hidden actions/i);

const styledSystem = buildImitateSystemPrompt(
  technicalOnlyCharacter,
  emptyContext,
  ['She folds her arms and looks toward the door.'],
  'en',
  ''
);
assert.match(styledSystem, /Match the player perspective actually established by the style examples/i);
assert.doesNotMatch(styledSystem, /There are no player writing-style examples yet/i);'''
imitate_test = replace_once(imitate_test, anchor, anchor + '\n' + addition, 'Imitate regression anchor')
imitate_test_path.write_text(imitate_test)

legacy_test_path = Path('tests/legacyCharacterMigration.test.ts')
legacy_test = legacy_test_path.read_text()
old_assert = "assert.match(cleanedDean.postHistoryInstructions || '', /Dean bleibt eigeninitiativ/);\nassert.match(cleanedDean.postHistoryInstructions || '', /keine bereits bestehenden biografischen Canon-Fakten/);"
new_assert = "assert.match(cleanedDean.postHistoryInstructions || '', /Dean handelt eigeninitiativ/);\nassert.match(cleanedDean.postHistoryInstructions || '', /keine konkrete Offscreen-Tatsache/);"
legacy_test = replace_once(legacy_test, old_assert, new_assert, 'Legacy Dean post-history assertions')
legacy_test_path.write_text(legacy_test)

print('Refined Imitate knowledge/perspective grounding and Dean canon behavior')
