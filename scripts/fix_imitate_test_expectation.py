from pathlib import Path

path = Path('tests/imitateKnowledge.test.ts')
text = path.read_text()

replacements = [
    (
        "assert.match(englishSystem, /does NOT prove reciprocal familiarity/i);",
        "assert.match(englishSystem, /does NOT prove that the player knows this/i);",
    ),
    (
        "assert.match(englishSystem, /do not invent it/i);",
        "assert.match(englishSystem, /do not invent prior familiarity/i);",
    ),
    (
        "assert.match(germanSystem, /erfinde (?:ihn|sie) nicht/i);",
        "assert.match(germanSystem, /Erfinde keine frühere Bekanntschaft/i);",
    ),
    (
        "assert.match(loreSystem, /unobserved information.*not automatically/i);",
        "assert.match(loreSystem, /Hidden details.*NOT automatically known/i);",
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Old Imitate assertion not found: {old}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('Updated all Imitate knowledge-boundary regression expectations')
