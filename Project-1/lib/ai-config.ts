/**
 * Client-side AI configuration helper.
 *
 * Stores user-scoped AI API keys (e.g. Google Gemini) in localStorage only.
 * AI keys are NEVER stored on the server or in cookies.
 * Keys are passed to authenticated server endpoints via the `x-ai-config` request header.
 */

export function getAiStorageKey(userId?: string | null): string {
  if (userId) {
    return `markly_gemini_api_key_${userId}`;
  }
  return `markly_gemini_api_key_guest`;
}

export function getStoredAiApiKey(userId?: string | null): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  const storageKey = getAiStorageKey(userId);
  return window.localStorage.getItem(storageKey);
}

export function setStoredAiApiKey(apiKey: string, userId?: string | null): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  const storageKey = getAiStorageKey(userId);
  const trimmed = apiKey.trim();
  if (trimmed) {
    window.localStorage.setItem(storageKey, trimmed);
  } else {
    window.localStorage.removeItem(storageKey);
  }
}

export function clearStoredAiApiKey(userId?: string | null): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  const storageKey = getAiStorageKey(userId);
  window.localStorage.removeItem(storageKey);
  // Remove legacy global key if present to prevent unauthenticated reuse
  window.localStorage.removeItem("markly_gemini_api_key");
}

export interface AiRequestHeaders {
  "x-ai-config"?: string;
}

/**
 * Reads the user-scoped AI API key from localStorage and returns the header dictionary:
 * { "x-ai-config": <apiKey> }
 * If no key is configured, returns an empty object {}.
 */
export function getAiRequestHeaders(userId?: string | null): AiRequestHeaders {
  const key = getStoredAiApiKey(userId);
  if (key && key.trim()) {
    return { "x-ai-config": key.trim() };
  }
  return {};
}
