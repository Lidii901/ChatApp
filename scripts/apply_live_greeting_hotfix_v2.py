from pathlib import Path

app_path = Path('src/App.tsx')
app = app_path.read_text()

old_import = "import { normalizeLegacyCharacterToV2 } from './utils/characterNormalizer';\n"
new_import = old_import + "import { formatApiError, greetingFallbackMessage } from './utils/apiErrors';\n"
assert old_import in app
app = app.replace(old_import, new_import, 1)

old_greeting = """    let firstGreeting = '';
    if (sourceGreeting) {
      try {
        firstGreeting = await localizeGreetingForChat(sourceGreeting, language);
      } catch (error) {
        console.warn('Could not localize first_mes; using language-aware generated opening instead.', error);
      }
    }
"""
new_greeting = """    let firstGreeting = '';
    let greetingWarning: string | null = null;
    if (sourceGreeting) {
      try {
        firstGreeting = await localizeGreetingForChat(sourceGreeting, language);
      } catch (error) {
        // Character Card V2 first_mes remains a valid opening when the optional
        // localization request cannot run, for example after an OpenRouter rate limit.
        firstGreeting = sourceGreeting;
        greetingWarning = greetingFallbackMessage(error);
        console.warn('Could not localize first_mes; using the stored Character Card greeting as fallback.', error);
      }
    }
"""
assert old_greeting in app
app = app.replace(old_greeting, new_greeting, 1)

old_after_view = """    setActiveCharacterId(char.id);
    setActiveChatId(newChatId);
    setCurrentView('chat');

    if (!firstGreeting) {
"""
new_after_view = """    setActiveCharacterId(char.id);
    setActiveChatId(newChatId);
    setCurrentView('chat');

    if (greetingWarning) {
      setErrorMessage(greetingWarning);
      addLog({
        type: 'error',
        status: 'error',
        model: settings.modelName || 'openrouter',
        message: greetingWarning,
      });
    } else {
      setErrorMessage(null);
    }

    if (!firstGreeting) {
"""
assert old_after_view in app
app = app.replace(old_after_view, new_after_view, 1)

old_start_response = """        const data = await response.json();
        if (data.jobId) {
          setActiveChatJobId(data.jobId);
          addPendingJob({
            id: data.jobId,
            type: 'start-chat',
            characterId: char.id,
            chatId: newChatId,
            createdAt: Date.now(),
          });
        }
      } catch (err) {
        console.error('Failed to trigger opening scene', err);
        setIsGenerating(false);
      }
"""
new_start_response = """        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }
        if (data.jobId) {
          setActiveChatJobId(data.jobId);
          addPendingJob({
            id: data.jobId,
            type: 'start-chat',
            characterId: char.id,
            chatId: newChatId,
            createdAt: Date.now(),
          });
        } else {
          throw new Error('Der Start-Chat-Job wurde nicht gestartet.');
        }
      } catch (err) {
        const errorMsg = formatApiError(err, 'Konnte die Startszene nicht generieren.');
        console.error('Failed to trigger opening scene', err);
        setErrorMessage(errorMsg);
        setIsGenerating(false);
        addLog({
          type: 'error',
          status: 'error',
          model: settings.modelName || 'openrouter',
          message: errorMsg,
        });
      }
"""
assert old_start_response in app
app = app.replace(old_start_response, new_start_response, 1)

old_poll_error = """          setActiveChatJobId(null);
          setIsGenerating(false);
          setErrorMessage(job.error || 'Fehler bei der Generierung.');
          addLog({
            type: 'error',
            status: 'error',
            model: settings.modelName || 'openrouter',
            message: job.error || 'Job fehlgeschlagen',
          });
"""
new_poll_error = """          setActiveChatJobId(null);
          setIsGenerating(false);
          const errorMsg = formatApiError(job.error, 'Fehler bei der Generierung.');
          setErrorMessage(errorMsg);
          addLog({
            type: 'error',
            status: 'error',
            model: settings.modelName || 'openrouter',
            message: errorMsg,
          });
"""
assert old_poll_error in app
app = app.replace(old_poll_error, new_poll_error, 1)
app_path.write_text(app)

Path('src/utils/apiErrors.ts').write_text("""export function formatApiError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error ?? '').trim();

  if (/free-models-per-day|rate limit exceeded|HTTP\\s*429|\\b429\\b/i.test(raw)) {
    return 'OpenRouter-Tageslimit für Free-Modelle erreicht. KI-Anfragen sind bis zum Reset des Kontingents oder bis wieder Kontingent verfügbar ist blockiert.';
  }

  return raw || fallback;
}

export function greetingFallbackMessage(error: unknown): string {
  const reason = formatApiError(error, 'Die Startnachricht konnte nicht lokalisiert werden.');
  return `${reason} Die gespeicherte Character-Card-Startnachricht wird deshalb unverändert angezeigt.`;
}
""")

Path('tests/apiErrors.test.ts').write_text("""import assert from 'node:assert/strict';
import { formatApiError, greetingFallbackMessage } from '../src/utils/apiErrors';

const rateLimit = 'OpenRouter API Fehler (HTTP 429): Rate limit exceeded: free-models-per-day.';
assert.match(formatApiError(rateLimit, 'fallback'), /OpenRouter-Tageslimit/);
assert.match(formatApiError(rateLimit, 'fallback'), /blockiert/);
assert.match(greetingFallbackMessage(rateLimit), /Character-Card-Startnachricht/);
assert.match(greetingFallbackMessage(rateLimit), /unverändert angezeigt/);
assert.equal(formatApiError(new Error('Netzwerkfehler'), 'fallback'), 'Netzwerkfehler');
assert.equal(formatApiError('', 'fallback'), 'fallback');

console.log('API error and greeting fallback assertions passed.');
""")
