"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Cpu,
  Globe,
  Bot,
  Zap,
} from "lucide-react";

export type ProviderType = "gemini" | "openrouter" | "grok" | "universal";

interface ProviderPreset {
  id: ProviderType;
  name: string;
  badge: string;
  defaultBaseUrl: string;
  defaultModel: string;
  keyUrl: string;
  keyLabel: string;
  placeholder: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "Free Tier Available",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-1.5-flash",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyLabel: "Google AI Studio",
    placeholder: "AIzaSy...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    badge: "Free & Multi-LLM",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    keyUrl: "https://openrouter.ai/keys",
    keyLabel: "openrouter.ai/keys",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    badge: "Fast & Smart",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-beta",
    keyUrl: "https://console.x.ai",
    keyLabel: "console.x.ai",
    placeholder: "xai-...",
  },
  {
    id: "universal",
    name: "Universal (OpenAI)",
    badge: "Ollama / DeepSeek / Any API",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    keyLabel: "Custom / OpenAI",
    placeholder: "sk-...",
  },
];

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const [provider, setProvider] = React.useState<ProviderType>("gemini");
  const [apiKey, setApiKey] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("https://generativelanguage.googleapis.com");
  const [model, setModel] = React.useState("gemini-1.5-flash");

  const [showKey, setShowKey] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load configuration from localStorage on open
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedConfig = localStorage.getItem("markly_ai_config");
      const legacyGeminiKey = localStorage.getItem("markly_gemini_api_key");

      if (storedConfig) {
        try {
          const parsed = JSON.parse(storedConfig);
          setProvider(parsed.provider || "gemini");
          setApiKey(parsed.apiKey || "");
          setBaseUrl(parsed.baseUrl || PROVIDERS.find((p) => p.id === parsed.provider)?.defaultBaseUrl || "");
          setModel(parsed.model || PROVIDERS.find((p) => p.id === parsed.provider)?.defaultModel || "");
          setIsSaved(Boolean(parsed.apiKey));
        } catch {
          // ignore parse error
        }
      } else if (legacyGeminiKey) {
        setProvider("gemini");
        setApiKey(legacyGeminiKey);
        setBaseUrl("https://generativelanguage.googleapis.com");
        setModel("gemini-1.5-flash");
        setIsSaved(true);
      } else {
        setIsSaved(false);
      }
      setTestStatus(null);
    }
  }, [open]);

  // Handle provider tab switch
  const handleSelectProvider = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const preset = PROVIDERS.find((p) => p.id === newProvider)!;
    setBaseUrl(preset.defaultBaseUrl);
    setModel(preset.defaultModel);
    setTestStatus(null);
  };

  // Save config
  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    if (typeof window !== "undefined") {
      if (trimmedKey) {
        const config = {
          provider,
          apiKey: trimmedKey,
          baseUrl: baseUrl.trim(),
          model: model.trim(),
        };

        const serialized = JSON.stringify(config);
        localStorage.setItem("markly_ai_config", serialized);
        localStorage.setItem("markly_gemini_api_key", trimmedKey);

        document.cookie = `markly_ai_config=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `markly_gemini_api_key=${encodeURIComponent(trimmedKey)}; path=/; max-age=31536000; SameSite=Lax`;

        setIsSaved(true);
        setTestStatus({
          success: true,
          message: `${PROVIDERS.find((p) => p.id === provider)?.name} connected and saved successfully!`,
        });
      } else {
        handleClear();
      }
    }
  };

  // Clear config
  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("markly_ai_config");
      localStorage.removeItem("markly_gemini_api_key");
      document.cookie = "markly_ai_config=; path=/; max-age=0";
      document.cookie = "markly_gemini_api_key=; path=/; max-age=0";
      setApiKey("");
      setIsSaved(false);
      setTestStatus({
        success: false,
        message: "Configuration cleared. Using built-in offline classification engine.",
      });
    }
  };

  // Live Test Key against active provider
  const handleTestKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setTestStatus({
        success: false,
        message: "Please enter an API key first.",
      });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      if (provider === "gemini") {
        // Google Gemini API Test
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-flash"}:generateContent?key=${trimmedKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Say 'Ready'" }] }],
            }),
          }
        );

        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          setTestStatus({
            success: true,
            message: "Verified! Google Gemini API key is valid and connected.",
          });
          handleSave();
        } else {
          setTestStatus({
            success: false,
            message: data.error?.message || "Invalid Gemini key or quota exceeded.",
          });
        }
      } else {
        // OpenAI-Compatible Providers (OpenRouter, Grok, Universal)
        const cleanBase = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
        const res = await fetch(`${cleanBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${trimmedKey}`,
            "HTTP-Referer": "https://markly.app",
            "X-Title": "Markly",
          },
          body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages: [{ role: "user", content: "Say 'Ready'" }],
            max_tokens: 10,
          }),
        });

        const data = await res.json();
        if (res.ok && data.choices?.[0]?.message?.content) {
          setTestStatus({
            success: true,
            message: `Verified! ${PROVIDERS.find((p) => p.id === provider)?.name} is active and responding.`,
          });
          handleSave();
        } else {
          setTestStatus({
            success: false,
            message: data.error?.message || `Endpoint returned status ${res.status}. Check API key and Base URL.`,
          });
        }
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: `Network error verifying provider: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const activePreset = PROVIDERS.find((p) => p.id === provider)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-[#181818] border-2 border-slate-200 dark:border-neutral-800 shadow-2xl rounded-3xl animate-in zoom-in-95">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white relative">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl mx-auto shadow-inner border border-white/30 mb-3">
            <Sparkles className="h-6 w-6 text-yellow-300" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-center text-white">
            Universal AI & API Key Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80 mt-1 max-w-sm mx-auto text-center">
            Connect Google Gemini, OpenRouter, Grok, or any custom OpenAI-compatible API to auto-classify bookmarks.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isSaved ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="font-medium text-slate-700 dark:text-neutral-300">
                {isSaved ? `Connected: ${activePreset.name}` : "Built-in Offline Engine (Free)"}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-muted-foreground truncate max-w-36">
              {isSaved ? model : "heuristic taxonomy"}
            </span>
          </div>

          {/* Provider Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-indigo-500" />
              <span>Choose AI Provider</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 dark:bg-neutral-900 p-1.5 rounded-xl border border-slate-200 dark:border-neutral-800">
              {PROVIDERS.map((p) => {
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? "bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                        : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{p.name.split(" ")[0]}</span>
                    <span className="text-[9px] opacity-70 font-normal truncate max-w-[75px]">{p.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                <span>{activePreset.name} API Key</span>
              </label>
              <a
                href={activePreset.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Get key from {activePreset.keyLabel}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder={activePreset.placeholder}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsSaved(false);
                  setTestStatus(null);
                }}
                className="w-full h-10 px-3.5 pr-20 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Model Name & Base URL (For OpenRouter, Grok, and Universal) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                <span>Model Name</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="e.g. gemini-1.5-flash or llama-3.3-70b"
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-500" />
                <span>API Base URL</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                disabled={provider === "gemini"}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="https://..."
                className={`w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono ${
                  provider === "gemini" ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />
            </div>
          </div>

          {/* Test Status Feedback */}
          {testStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testStatus.success
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-500" />
              )}
              <span className="leading-snug">{testStatus.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Remove API Key"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestKey}
                disabled={!apiKey.trim() || isTesting}
                className="h-8 text-xs cursor-pointer gap-1.5"
              >
                {isTesting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Cpu className="h-3 w-3 text-indigo-500" />
                )}
                <span>Test Connection</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
