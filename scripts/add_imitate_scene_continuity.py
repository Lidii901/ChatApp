from pathlib import Path

server_path = Path('server.ts')
server = server_path.read_text()

old_de = "- Erfinde keine frühere Bekanntschaft und lass die Spielerfigur keine verborgenen Handlungen als Tatsache behaupten, solange sie diese nicht wahrgenommen oder erfahren hat.`;"
new_de = "- Erfinde keine frühere Bekanntschaft und lass die Spielerfigur keine verborgenen Handlungen als Tatsache behaupten, solange sie diese nicht wahrgenommen oder erfahren hat.\n- Bewahre bereits etablierte objektive Szenenzustände. Ändere konkrete Zustände wie offen/geschlossen, Position oder Körperhaltung, gehaltene/platzierte Gegenstände oder vergleichbare physische Fakten nicht stillschweigend; eine Änderung braucht eine im neuen Spielzug tatsächlich ausgeführte Handlung oder ein etabliertes Ereignis.`;"

old_en = "- Do not invent prior familiarity and do not make the player assert hidden actions as fact unless the player actually perceived or learned them.`;"
new_en = "- Do not invent prior familiarity and do not make the player assert hidden actions as fact unless the player actually perceived or learned them.\n- Preserve already established objective scene state. Do not silently change concrete states such as open/closed, position or posture, held/placed objects, or comparable physical facts; a change requires an action actually performed in the new turn or an established event.`;"

old_task_de = "? `AUFGABE: Verfasse jetzt ausschliesslich den nächsten Spielzug von ${playerAddress}. Bewahre exakt den belegten Beziehungs- und Wissensstand. Behandle private Gedanken, innere Erzählung, unbeobachtete Handlungen und geheime Informationen der anderen Figur NICHT als Wissen von ${playerAddress}. Erfinde keine frühere Bekanntschaft und keine Gewissheit über verborgene Handlungen.`"
new_task_de = "? `AUFGABE: Verfasse jetzt ausschliesslich den nächsten Spielzug von ${playerAddress}. Bewahre exakt den belegten Beziehungs- und Wissensstand. Behandle private Gedanken, innere Erzählung, unbeobachtete Handlungen und geheime Informationen der anderen Figur NICHT als Wissen von ${playerAddress}. Erfinde keine frühere Bekanntschaft und keine Gewissheit über verborgene Handlungen. Verändere bereits etablierte physische Szenenzustände nur, wenn der neue Spielzug selbst eine plausible Handlung dafür ausführt oder ein etabliertes Ereignis die Änderung verursacht.`"

old_task_en = ": `TASK: Write only ${playerAddress}'s next roleplay turn. Preserve exactly the established relationship and knowledge state. Do NOT treat the other character's private thoughts, internal narration, unseen actions or secret information as knowledge possessed by ${playerAddress}. Do not invent prior familiarity or certainty about hidden actions.`;"
new_task_en = ": `TASK: Write only ${playerAddress}'s next roleplay turn. Preserve exactly the established relationship and knowledge state. Do NOT treat the other character's private thoughts, internal narration, unseen actions or secret information as knowledge possessed by ${playerAddress}. Do not invent prior familiarity or certainty about hidden actions. Change an already established physical scene state only when the new turn itself performs a plausible action that causes the change or an established event causes it.`;"

changes = 0
for old, new, label in [
    (old_de, new_de, 'German evidence continuity'),
    (old_en, new_en, 'English evidence continuity'),
    (old_task_de, new_task_de, 'German task continuity'),
    (old_task_en, new_task_en, 'English task continuity'),
]:
    if new in server:
        continue
    if old not in server:
        raise SystemExit(f'{label} source text not found')
    server = server.replace(old, new, 1)
    changes += 1

server_path.write_text(server)

test_path = Path('tests/imitateKnowledge.test.ts')
test = test_path.read_text()
marker = "assert.match(englishUserPrompt, /certainty about hidden actions/i);"
extra = """assert.match(englishSystem, /Preserve already established objective scene state/i);\nassert.match(englishSystem, /open\\/closed, position or posture, held\\/placed objects/i);\nassert.match(englishUserPrompt, /already established physical scene state/i);"""
if extra not in test:
    if marker not in test:
        raise SystemExit('English Imitate assertion marker not found')
    test = test.replace(marker, marker + '\n' + extra, 1)

marker_de = "assert.match(germanSystem, /Erfinde keine frühere Bekanntschaft/i);"
extra_de = "assert.match(germanSystem, /Bewahre bereits etablierte objektive Szenenzustände/i);"
if extra_de not in test:
    if marker_de not in test:
        raise SystemExit('German Imitate assertion marker not found')
    test = test.replace(marker_de, marker_de + '\n' + extra_de, 1)

test_path.write_text(test)
print(f'Imitate scene-continuity refinement applied ({changes} server replacements).')
