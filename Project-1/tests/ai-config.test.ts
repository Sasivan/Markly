import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAiStorageKey,
  getStoredAiApiKey,
  setStoredAiApiKey,
  clearStoredAiApiKey,
  getAiRequestHeaders,
  getDailyAiQuota,
  incrementDailyAiUsage,
  FREE_DAILY_AI_LIMIT,
} from "../lib/ai-config";
import { sanitizeGeminiModel, ALLOWED_GEMINI_MODELS } from "../server/ai/suggest";

describe("Phase 12 Stage 1: AI Key Security & Helper Tests", () => {
  // In-memory mock localStorage for the test runner
  const storage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => storage[k] ?? null,
        setItem: (k: string, v: string) => {
          storage[k] = String(v);
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
        clear: () => {
          for (const key of Object.keys(storage)) delete storage[key];
        },
      },
    });
  });

  describe("1. User-Scoped AI Key Storage", () => {
    it("generates user-scoped storage key", () => {
      expect(getAiStorageKey("usr_abc123")).toBe("markly_gemini_api_key_usr_abc123");
      expect(getAiStorageKey(null)).toBe("markly_gemini_api_key_guest");
      expect(getAiStorageKey(undefined)).toBe("markly_gemini_api_key_guest");
    });

    it("saves and retrieves API key under user-scoped key", () => {
      setStoredAiApiKey("AIzaSySecretKeyOne", "usr_alice");
      expect(getStoredAiApiKey("usr_alice")).toBe("AIzaSySecretKeyOne");
      // Other user must NOT see Alice's key
      expect(getStoredAiApiKey("usr_bob")).toBeNull();
      expect(getStoredAiApiKey(null)).toBeNull();
    });

    it("clears user key and legacy global fallback on clearStoredAiApiKey", () => {
      setStoredAiApiKey("AIzaSyAlice", "usr_alice");
      storage["markly_gemini_api_key"] = "legacy_leaked_key";

      clearStoredAiApiKey("usr_alice");

      expect(getStoredAiApiKey("usr_alice")).toBeNull();
      expect(storage["markly_gemini_api_key"]).toBeUndefined();
    });
  });

  describe("2. Request Headers Helper (getAiRequestHeaders)", () => {
    it("returns empty object when no key is configured", () => {
      const headers = getAiRequestHeaders("usr_nonexistent");
      expect(headers).toEqual({});
      expect(headers["x-ai-config"]).toBeUndefined();
    });

    it("attaches x-ai-config header when user key exists", () => {
      setStoredAiApiKey("AIzaSyValidGeminiKey", "usr_active");
      const headers = getAiRequestHeaders("usr_active");
      expect(headers).toEqual({
        "x-ai-config": "AIzaSyValidGeminiKey",
      });
    });

    it("proves helper attaches header to outgoing request", () => {
      setStoredAiApiKey("AIzaSyMockedKey", "usr_tester");
      const outgoingHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...getAiRequestHeaders("usr_tester"),
      };

      expect(outgoingHeaders["Content-Type"]).toBe("application/json");
      expect(outgoingHeaders["x-ai-config"]).toBe("AIzaSyMockedKey");
    });
  });

  describe("3. Server Model Sanitization & Allowlist", () => {
    it("allows valid known Gemini models", () => {
      for (const model of ALLOWED_GEMINI_MODELS) {
        expect(sanitizeGeminiModel(model)).toBe(model);
        expect(sanitizeGeminiModel(`models/${model}`)).toBe(model);
      }
    });

    it("falls back to default gemini-flash-latest on unknown or malicious model input", () => {
      expect(sanitizeGeminiModel("")).toBe("gemini-flash-latest");
      expect(sanitizeGeminiModel(undefined)).toBe("gemini-flash-latest");
      expect(sanitizeGeminiModel("../../etc/passwd")).toBe("gemini-flash-latest");
      expect(sanitizeGeminiModel("gpt-4o-arbitrary")).toBe("gemini-flash-latest");
      expect(sanitizeGeminiModel("<script>alert(1)</script>")).toBe("gemini-flash-latest");
    });
  });

  describe("4. Daily Free AI Quota & Limits", () => {
    it("defaults to 30 free daily credits for a new user", () => {
      const quota = getDailyAiQuota("usr_quota_test");
      expect(quota.limit).toBe(FREE_DAILY_AI_LIMIT);
      expect(quota.used).toBe(0);
      expect(quota.remaining).toBe(30);
      expect(quota.isQuotaExceeded).toBe(false);
      expect(quota.hasCustomKey).toBe(false);
    });

    it("increments daily usage and detects quota exhaustion", () => {
      for (let i = 1; i <= 30; i++) {
        const q = incrementDailyAiUsage("usr_quota_test");
        expect(q.used).toBe(i);
        expect(q.remaining).toBe(30 - i);
        if (i < 30) {
          expect(q.isQuotaExceeded).toBe(false);
        } else {
          expect(q.isQuotaExceeded).toBe(true);
        }
      }

      // Beyond limit
      const exceeded = incrementDailyAiUsage("usr_quota_test");
      expect(exceeded.isQuotaExceeded).toBe(true);
      expect(exceeded.remaining).toBe(0);
    });

    it("grants unlimited access when user configures personal Gemini key", () => {
      setStoredAiApiKey("AIzaSyPersonalKey", "usr_unlimited");
      const quota = getDailyAiQuota("usr_unlimited");
      expect(quota.hasCustomKey).toBe(true);
      expect(quota.isQuotaExceeded).toBe(false);

      const updated = incrementDailyAiUsage("usr_unlimited");
      expect(updated.hasCustomKey).toBe(true);
      expect(updated.isQuotaExceeded).toBe(false);
    });
  });
});

