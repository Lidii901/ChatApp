from pathlib import Path

path = Path('tests/imitateKnowledge.test.ts')
text = path.read_text()
old = "assert.match(englishSystem, /does NOT prove reciprocal familiarity/i);"
new = "assert.match(englishSystem, /does NOT prove that the player knows this/i);"
if old not in text:
    raise SystemExit('Old reciprocal-familiarity assertion not found')
path.write_text(text.replace(old, new, 1))
print('Updated Imitate knowledge-boundary regression expectation')
