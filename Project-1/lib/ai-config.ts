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

export interface DailyAiQuota {
  used: number;
  limit: number;
  remaining: number;
  hasCustomKey: boolean;
  isQuotaExceeded: boolean;
}

export const FREE_DAILY_AI_LIMIT = 30;

/**
 * Returns the current daily free AI quota state for a user.
 * Users with custom API keys have unlimited access.
 * Free tier users receive 30 AI enrichment requests per calendar day.
 */
export function getDailyAiQuota(userId?: string | null): DailyAiQuota {
  const customKey = getStoredAiApiKey(userId);
  if (customKey && customKey.trim()) {
    return {
      used: 0,
      limit: FREE_DAILY_AI_LIMIT,
      remaining: FREE_DAILY_AI_LIMIT,
      hasCustomKey: true,
      isQuotaExceeded: false,
    };
  }

  if (typeof window === "undefined" || !window.localStorage) {
    return {
      used: 0,
      limit: FREE_DAILY_AI_LIMIT,
      remaining: FREE_DAILY_AI_LIMIT,
      hasCustomKey: false,
      isQuotaExceeded: false,
    };
  }

  const storageKey = `markly_ai_daily_${userId || "guest"}`;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        const used = Math.min(Number(parsed.count) || 0, FREE_DAILY_AI_LIMIT);
        return {
          used,
          limit: FREE_DAILY_AI_LIMIT,
          remaining: Math.max(0, FREE_DAILY_AI_LIMIT - used),
          hasCustomKey: false,
          isQuotaExceeded: used >= FREE_DAILY_AI_LIMIT,
        };
      }
    }
  } catch {}

  return {
    used: 0,
    limit: FREE_DAILY_AI_LIMIT,
    remaining: FREE_DAILY_AI_LIMIT,
    hasCustomKey: false,
    isQuotaExceeded: false,
  };
}

/**
 * Records an AI usage event for free tier users and returns updated quota.
 * Custom key users are not limited.
 */
export function incrementDailyAiUsage(userId?: string | null): DailyAiQuota {
  const customKey = getStoredAiApiKey(userId);
  if (customKey && customKey.trim()) {
    return {
      used: 0,
      limit: FREE_DAILY_AI_LIMIT,
      remaining: FREE_DAILY_AI_LIMIT,
      hasCustomKey: true,
      isQuotaExceeded: false,
    };
  }

  if (typeof window === "undefined" || !window.localStorage) {
    return {
      used: 1,
      limit: FREE_DAILY_AI_LIMIT,
      remaining: FREE_DAILY_AI_LIMIT - 1,
      hasCustomKey: false,
      isQuotaExceeded: false,
    };
  }

  const storageKey = `markly_ai_daily_${userId || "guest"}`;
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        count = Number(parsed.count) || 0;
      }
    }
  } catch {}

  count += 1;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ date: today, count }));
  } catch {}

  return {
    used: count,
    limit: FREE_DAILY_AI_LIMIT,
    remaining: Math.max(0, FREE_DAILY_AI_LIMIT - count),
    hasCustomKey: false,
    isQuotaExceeded: count >= FREE_DAILY_AI_LIMIT,
  };
}


