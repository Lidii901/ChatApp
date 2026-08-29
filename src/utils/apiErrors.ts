export function formatApiError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error ?? '').trim();

  if (/free-models-per-day|rate limit exceeded|HTTP\s*429|\b429\b/i.test(raw)) {
    return 'OpenRouter-Tageslimit für Free-Modelle erreicht. KI-Anfragen sind bis zum Reset des Kontingents oder bis wieder Kontingent verfügbar ist blockiert.';
  }

  return raw || fallback;
}

export function greetingFallbackMessage(error: unknown): string {
  const reason = formatApiError(error, 'Die Startnachricht konnte nicht lokalisiert werden.');
  return `${reason} Die gespeicherte Character-Card-Startnachricht wird deshalb unverändert angezeigt.`;
}
