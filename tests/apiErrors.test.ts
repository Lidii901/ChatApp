import assert from 'node:assert/strict';
import { formatApiError, greetingFallbackMessage } from '../src/utils/apiErrors';

const rateLimit = 'OpenRouter API Fehler (HTTP 429): Rate limit exceeded: free-models-per-day.';
assert.match(formatApiError(rateLimit, 'fallback'), /OpenRouter-Tageslimit/);
assert.match(formatApiError(rateLimit, 'fallback'), /blockiert/);
assert.match(greetingFallbackMessage(rateLimit), /Character-Card-Startnachricht/);
assert.match(greetingFallbackMessage(rateLimit), /unverändert angezeigt/);
assert.equal(formatApiError(new Error('Netzwerkfehler'), 'fallback'), 'Netzwerkfehler');
assert.equal(formatApiError('', 'fallback'), 'fallback');

console.log('API error and greeting fallback assertions passed.');
