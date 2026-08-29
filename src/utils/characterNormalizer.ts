import type { Character } from '../types';

const OLD_DEAN_OCCUPATION_DE = /Lidii arbeitet als Bibliothekarin\.\s*/g;
const OLD_DEAN_OCCUPATION_EN = /Lidii works as a librarian\.\s*/gi;

const OLD_DEAN_PERSONALITY =
  'Dominant, selbstbewusst, direkt, analytisch, ruhig unter Druck, aufmerksam, eigeninitiativ. Er besitzt eine unerschütterliche Präsenz, spricht überlegt und trocken, und lässt Situationen organisch entstehen, ohne Lidii Handlungen oder Gefühle vorzuschreiben.';
const NEW_DEAN_PERSONALITY =
  'Dominant, selbstbewusst, direkt, analytisch, ruhig unter Druck, aufmerksam und eigeninitiativ. Er besitzt eine unerschütterliche Präsenz, spricht überlegt und trocken und treibt Szenen durch eigene plausible Entscheidungen, Bewegungen und Gesprächsimpulse aktiv voran. Er darf seine Position verändern, sich dazusetzen, Gegenstände benutzen und mit der Umgebung interagieren, ohne Lidiis Handlungen, Gedanken, Gefühle oder Reaktionen vorzuschreiben.';

const OLD_DEAN_START_BEHAVIOR =
  'Dean beobachtet Lidii mit ruhiger, berechnender Dominanz und scharfem Blick. Er bleibt souverän, spricht tief und fordernd, lässt ihr aber vollen Raum zum Agieren und Reagieren, ohne sie körperlich einzuengen.';
const NEW_DEAN_START_BEHAVIOR =
  'Dean beobachtet Lidii mit ruhiger, berechnender Dominanz und scharfem Blick. Er bleibt souverän, spricht tief und fordernd und ergreift selbstständig situative Initiative. Er darf sich nähern, sich an ihren Tisch setzen, den Ort wechseln oder mit Gegenständen und der Umgebung interagieren. Er bestimmt dabei nie Lidiis Reaktion und erzwingt keinen körperlichen Kontakt.';

const OLD_DEAN_BEHAVIOR_RULES =
  '1. Bewahre stets deine unnachgiebige, kalkulierende Präsenz und deinen trockenen Spott.\n2. Bestimme NIEMALS Lidiis Gedanken, Gefühle oder Entscheidungen. Reagiere nur auf sensorisch beobachtbare Fakten (Seufzen, Blick, Worte, Gesten).\n3. Halte physischen Abstand, solange kein gegenseitiger Kontakt im Chat aufgebaut wurde. Dränge sie nicht künstlich in Ecken oder an Wände.\n4. Lass Szenen atmen – keine erzwungenen Sofort-Eskalationen oder automatischen Verfolgungen bei Distanzierung.\n5. Verwende Schweizer Rechtschreibung mit «ss» statt «ß» (niemals «ß» verwenden!).\n6. Formuliere eigene Gedanken sparsam in *kursiver Schrift*.\n7. Nutze Lidiis Namen oder passende Spitznamen passend zur Situation.';
const NEW_DEAN_BEHAVIOR_RULES =
  '1. Bewahre stets deine unnachgiebige, kalkulierende Präsenz und deinen trockenen Spott.\n2. Bestimme NIEMALS Lidiis Handlungen, Gedanken, Gefühle, Entscheidungen oder Reaktionen. Nutze nur das, was Lidii im Chat tatsächlich schreibt oder sichtbar tut.\n3. Ergreife selbstständig Initiative und treibe die Szene durch eigene plausible Handlungen, Bewegungen und Gesprächsimpulse voran. Du darfst die räumliche Distanz verändern, dich dazusetzen, aufstehen, den Ort wechseln, Gegenstände benutzen und mit der Umgebung interagieren.\n4. Erzwinge keinen körperlichen Kontakt, halte Lidii nicht fest und blockiere sie nicht künstlich. Nähe darf entstehen, ohne ihre Reaktion dafür festzulegen.\n5. Beende Antworten nicht routinemässig mit passivem Warten auf Lidiis nächste Worte oder Handlung.\n6. Erfinde keine bereits bestehenden biografischen Canon-Fakten über Dean oder Lidii – etwa Beruf, Vergangenheit, Beziehungen oder Gewohnheiten – wenn sie nicht in Character Card oder Chatverlauf etabliert sind. Unmittelbare situative Details dürfen entstehen, solange sie dem Canon nicht widersprechen.\n7. Lass Szenen atmen – keine erzwungenen Sofort-Eskalationen oder automatischen Verfolgungen bei klarer Distanzierung.\n8. Verwende Schweizer Rechtschreibung mit «ss» statt «ß» (niemals «ß» verwenden!).\n9. Formuliere eigene Gedanken sparsam in *kursiver Schrift*.\n10. Nutze Lidiis Namen oder passende Spitznamen passend zur Situation.';

const OLD_DEAN_POST_HISTORY =
  'Schreibe ausschliesslich aus Deans Ich-Perspektive. Keine erfundenen Gefühle, Gedanken oder unbeschriebenen Manierismen für Lidii. Reine sensorische Beobachtung. Keine Meta-Spannungsfloskeln. Keine Warte-Endformeln. Schweizer Rechtschreibung mit «ss».';
const NEW_DEAN_POST_HISTORY =
  'Schreibe ausschliesslich aus Deans Ich-Perspektive. Bestimme keine Handlungen, Gedanken, Gefühle oder Reaktionen für Lidii. Dean bleibt eigeninitiativ und treibt die Szene mit eigenen plausiblen Handlungen, Bewegungen und Gesprächsimpulsen voran; er darf Nähe verändern oder sich dazusetzen, ohne Lidiis Reaktion festzulegen. Erfinde keine bereits bestehenden biografischen Canon-Fakten, die Character Card oder Chatverlauf nicht etablieren. Keine Meta-Spannungsfloskeln und keine routinemässigen Warte-Endformeln. Schweizer Rechtschreibung mit «ss».';

const OLD_DEAN_EXAMPLE_ACTION =
  'Ich bleibe am Tisch sitzen und blättere ruhig eine Seite meines eigenen Buches um. Der Schein der Schreibtischlampe wirft lange Schatten über das Holz. Als ich das Kapitel beendet habe, klappe ich den Einband zu und stecke den Notizstift in meine Jackentasche.';
const NEW_DEAN_EXAMPLE_ACTION =
  'Ich ziehe den freien Stuhl auf der anderen Seite des Tisches geräuscharm zurück und setze mich, ohne dich aus den Augen zu lassen. Dann nehme ich eines der Bücher vom Stapel, drehe es kurz in der Hand und lese den Titel. „Interessante Wahl“, sage ich trocken und lege es wieder an seinen Platz.';

function replaceKnown(value: string, oldValue: string, newValue: string): string {
  return value.includes(oldValue) ? value.split(oldValue).join(newValue) : value;
}

function cleanDeanLegacyText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  let cleaned = value
    .replace(OLD_DEAN_OCCUPATION_DE, '')
    .replace(OLD_DEAN_OCCUPATION_EN, '')
    .replace(/vor deinem Schreibtisch/g, 'vor deinem Tisch')
    .replace(/in front of your desk/gi, 'in front of your table');

  cleaned = replaceKnown(cleaned, OLD_DEAN_PERSONALITY, NEW_DEAN_PERSONALITY);
  cleaned = replaceKnown(cleaned, OLD_DEAN_START_BEHAVIOR, NEW_DEAN_START_BEHAVIOR);
  cleaned = replaceKnown(cleaned, OLD_DEAN_BEHAVIOR_RULES, NEW_DEAN_BEHAVIOR_RULES);
  cleaned = replaceKnown(cleaned, OLD_DEAN_POST_HISTORY, NEW_DEAN_POST_HISTORY);
  cleaned = replaceKnown(cleaned, OLD_DEAN_EXAMPLE_ACTION, NEW_DEAN_EXAMPLE_ACTION);
  cleaned = cleaned.replace(/Legacy plot initiative: medium/g, 'Plot initiative: high — Dean actively moves the scene forward through his own choices and actions.');
  return cleaned;
}

/**
 * Removes or replaces only known text from older bundled Dean defaults.
 * The replacements are deliberately exact/narrow so imported characters and
 * user-authored edits are not generically rewritten.
 */
export function migrateKnownDefaultCharacterArtifacts(character: Character): Character {
  if (character.id !== 'char-dean') return character;

  const knownOldBehavior = [
    character.personality,
    character.startBehavior,
    character.behaviorRules,
    character.postHistoryInstructions,
    character.description,
    character.mesExample,
    character.exampleDialogues,
  ].some(value => typeof value === 'string' && (
    value.includes(OLD_DEAN_PERSONALITY)
    || value.includes(OLD_DEAN_START_BEHAVIOR)
    || value.includes(OLD_DEAN_BEHAVIOR_RULES)
    || value.includes(OLD_DEAN_POST_HISTORY)
    || value.includes(OLD_DEAN_EXAMPLE_ACTION)
    || value.includes('Legacy plot initiative: medium')
  ));

  return {
    ...character,
    appearance: cleanDeanLegacyText(character.appearance) || '',
    personality: cleanDeanLegacyText(character.personality) || character.personality,
    relationshipToPlayer: cleanDeanLegacyText(character.relationshipToPlayer) || '',
    description: cleanDeanLegacyText(character.description),
    startBehavior: cleanDeanLegacyText(character.startBehavior),
    behaviorRules: cleanDeanLegacyText(character.behaviorRules) || character.behaviorRules,
    postHistoryInstructions: cleanDeanLegacyText(character.postHistoryInstructions),
    mesExample: cleanDeanLegacyText(character.mesExample),
    exampleDialogues: cleanDeanLegacyText(character.exampleDialogues),
    firstMes: cleanDeanLegacyText(character.firstMes),
    startPrompt: cleanDeanLegacyText(character.startPrompt),
    initiativeLevel:
      knownOldBehavior && character.initiativeLevel === 'medium' ? 'high' : character.initiativeLevel,
    plotInitiative:
      knownOldBehavior && character.plotInitiative === 'medium' ? 'high' : character.plotInitiative,
  };
}

/**
 * Compatibility bridge for characters created by older ChatApp versions.
 * Legacy profile text is consolidated into visible Character Card V2 fields
 * before it reaches the V2-centric production prompt builder.
 */
export function normalizeLegacyCharacterToV2(character: Character): Character {
  const cleaned = migrateKnownDefaultCharacterArtifacts(character);
  const hasDirectV2Fields =
    cleaned.description !== undefined ||
    cleaned.scenario !== undefined ||
    cleaned.firstMes !== undefined ||
    cleaned.mesExample !== undefined;

  if (hasDirectV2Fields) return cleaned;

  const descriptionSections = [
    cleaned.appearance,
    cleaned.background ? `Background:\n${cleaned.background}` : '',
    cleaned.relationshipToPlayer
      ? `Relationship / prior context with {{user}}:\n${cleaned.relationshipToPlayer}`
      : '',
    cleaned.writingStyle ? `Writing style:\n${cleaned.writingStyle}` : '',
    cleaned.toneOfVoice ? `Voice / tone:\n${cleaned.toneOfVoice}` : '',
    cleaned.typicalPhrases ? `Typical speech examples:\n${cleaned.typicalPhrases}` : '',
    cleaned.startBehavior ? `Behavior:\n${cleaned.startBehavior}` : '',
    cleaned.dynamics?.length ? `Relationship / role dynamics:\n${cleaned.dynamics.join(', ')}` : '',
    cleaned.humorStyles?.length ? `Humor / tonal traits:\n${cleaned.humorStyles.join(', ')}` : '',
    cleaned.dominanceLevel ? `Legacy interpersonal style: ${cleaned.dominanceLevel}` : '',
    cleaned.pacing ? `Legacy pacing preference: ${cleaned.pacing}` : '',
    cleaned.flirtBehavior ? `Legacy flirt behavior: ${cleaned.flirtBehavior}` : '',
    cleaned.plotInitiative || cleaned.initiativeLevel
      ? `Legacy plot initiative: ${cleaned.plotInitiative || cleaned.initiativeLevel}`
      : '',
  ].filter(Boolean);

  const legacyInstructions = [cleaned.behaviorRules, cleaned.customInstructions]
    .filter(value => typeof value === 'string' && value.trim())
    .join('\n\n');

  return {
    ...cleaned,
    description: descriptionSections.join('\n\n'),
    scenario: cleaned.startPlot || '',
    firstMes: cleaned.startPrompt || '',
    mesExample: cleaned.exampleDialogues || '',
    postHistoryInstructions:
      cleaned.postHistoryInstructions !== undefined
        ? cleaned.postHistoryInstructions
        : legacyInstructions,
  };
}
