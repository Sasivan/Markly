"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/auth-context";
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

export type ProviderType = "gemini" | "codecraft" | "openrouter" | "grok" | "universal";

const DEFAULT_GOOGLE_KEY = process.env.NEXT_PUBLIC_DEFAULT_GEMINI_KEY || "";

interface ProviderPreset {
  id: ProviderType;
  name: string;
  badge: string;
  defaultBaseUrl: string;
  defaultModel: string;
  models: { id: string; label: string; desc: string }[];
  keyUrl: string;
  keyLabel: string;
  placeholder: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "Official & Fast (Free Tier)",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-flash-latest",
    models: [
      {
        id: "gemini-flash-latest",
        label: "gemini-flash-latest (Recommended)",
        desc: "Fast, accurate, Google's latest active Flash model (Free Tier)",
      },
      {
        id: "gemini-3.8-flash",
        label: "gemini-3.8-flash (Latest General)",
        desc: "Google's updated modern Flash model",
      },
      {
        id: "gemini-3.8-flash-lite",
        label: "gemini-3.8-flash-lite (Ultra Fast)",
        desc: "Lightweight, ultra low-latency Flash model",
      },
      {
        id: "gemini-2.5-pro",
        label: "gemini-2.5-pro (High Reasoning)",
        desc: "Deep reasoning and extensive context window",
      },
      {
        id: "custom",
        label: "Custom Gemini Model...",
        desc: "Type custom model name",
      },
    ],
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyLabel: "Google AI Studio",
    placeholder: "AIzaSy... or AQ.Ab8...",
  },
  {
    id: "codecraft",
    name: "CodeCraft API",
    badge: "Fast & OpenAI-Compatible",
    defaultBaseUrl: "https://codecraftapi.com/v1",
    defaultModel: "gemini-3.7-flash",
    models: [
      {
        id: "gemini-3.7-flash",
        label: "gemini-3.7-flash (Recommended)",
        desc: "Ultra-fast response on CodeCraft",
      },
      {
        id: "deepseek-v4-flash-0731",
        label: "deepseek-v4-flash-0731",
        desc: "DeepSeek Flash model on CodeCraft",
      },
      {
        id: "gpt-5.5",
        label: "gpt-5.5",
        desc: "Next-gen GPT model on CodeCraft",
      },
      {
        id: "qwen3.8-27b",
        label: "qwen3.8-27b",
        desc: "Qwen 27B model on CodeCraft",
      },
      {
        id: "custom",
        label: "Custom CodeCraft Model...",
        desc: "Type custom model ID",
      },
    ],
    keyUrl: "https://codecraftapi.com",
    keyLabel: "codecraftapi.com",
    placeholder: "cc_zNRfWvwFEZ2sHIi787kIQfPxsmXw2zK1t2RuoYonlJ1BXTx1",
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    badge: "Fast & Smart",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-beta",
    models: [
      {
        id: "grok-beta",
        label: "grok-beta (Fast & Direct)",
        desc: "xAI's flagship conversational and classification model",
      },
      {
        id: "grok-2",
        label: "grok-2 (High Precision)",
        desc: "Advanced Grok 2 reasoning model",
      },
      {
        id: "custom",
        label: "Custom Grok Model...",
        desc: "Type custom model name",
      },
    ],
    keyUrl: "https://console.x.ai",
    keyLabel: "console.x.ai",
    placeholder: "xai-...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    badge: "Free & Multi-LLM",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    models: [
      {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        label: "Llama 3.3 70B (Free)",
        desc: "Meta's most capable open model, completely free on OpenRouter",
      },
      {
        id: "deepseek/deepseek-r1:free",
        label: "DeepSeek R1 (Free)",
        desc: "Leading reasoning model available with free tier tokens",
      },
      {
        id: "google/gemini-2.0-flash-exp:free",
        label: "Gemini 2.0 Flash (Free via OpenRouter)",
        desc: "Next-gen experimental Gemini hosted on OpenRouter",
      },
      {
        id: "custom",
        label: "Custom OpenRouter Model...",
        desc: "Enter any model ID from the OpenRouter catalog",
      },
    ],
    keyUrl: "https://openrouter.ai/keys",
    keyLabel: "OpenRouter Keys",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "universal",
    name: "Custom / Universal (CodeCraft, Ollama, OpenAI)",
    badge: "Any API / Local",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: [
      {
        id: "custom",
        label: "Custom Model (e.g. codecraft-model, llama3, deepseek-chat)",
        desc: "Enter your model name below",
      },
      {
        id: "gpt-4o-mini",
        label: "gpt-4o-mini (OpenAI Default)",
        desc: "Fast, cost-effective OpenAI model",
      },
      {
        id: "deepseek-chat",
        label: "deepseek-chat (DeepSeek V3)",
        desc: "Use with https://api.deepseek.com/v1",
      },
    ],
    keyUrl: "https://platform.openai.com/api-keys",
    keyLabel: "API Provider",
    placeholder: "sk-... or custom key",
  },
];

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const { user } = useAuth();
  const [provider, setProvider] = React.useState<ProviderType>("gemini");
  const [apiKey, setApiKey] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("https://generativelanguage.googleapis.com");
  const [model, setModel] = React.useState("gemini-flash-latest");
  const [customModelInput, setCustomModelInput] = React.useState("");

  const [showKey, setShowKey] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load configuration from localStorage or prefill default key
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedConfig = localStorage.getItem("markly_ai_config");
      const legacyGeminiKey = localStorage.getItem("markly_gemini_api_key");

      if (storedConfig) {
        try {
          const parsed = JSON.parse(storedConfig);
          const p = (parsed.provider || "gemini") as ProviderType;
          setProvider(p);
          setApiKey(parsed.apiKey || "");
          setBaseUrl(parsed.baseUrl || PROVIDERS.find((item) => item.id === p)?.defaultBaseUrl || "");

          let storedModel = parsed.model || PROVIDERS.find((item) => item.id === p)?.defaultModel || "gemini-flash-latest";
          if (storedModel === "gemini-1.5-flash" || storedModel === "gemini-1.5-pro") {
            storedModel = "gemini-flash-latest";
          }
          const preset = PROVIDERS.find((item) => item.id === p)!;
          const knownModel = preset.models.some((m) => m.id === storedModel);
          if (knownModel) {
            setModel(storedModel);
          } else {
            setModel("custom");
            setCustomModelInput(storedModel);
          }

          setIsSaved(Boolean(parsed.apiKey));
        } catch {
          // ignore error
        }
      } else if (legacyGeminiKey) {
        setProvider("gemini");
        setApiKey(legacyGeminiKey);
        setBaseUrl("https://generativelanguage.googleapis.com");
        setModel("gemini-flash-latest");
        setIsSaved(true);
      } else if (DEFAULT_GOOGLE_KEY) {
        setProvider("gemini");
        setApiKey(DEFAULT_GOOGLE_KEY);
        setBaseUrl("https://generativelanguage.googleapis.com");
        setModel("gemini-flash-latest");
        setIsSaved(true);
      } else {
        setIsSaved(false);
      }
      setTestStatus(null);
    }
  }, [open, user?.email]);

  // Handle provider switch in single unified page
  const handleSelectProvider = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const preset = PROVIDERS.find((p) => p.id === newProvider)!;
    setBaseUrl(preset.defaultBaseUrl);
    setModel(preset.defaultModel);
    setCustomModelInput(newProvider === "universal" ? "codecraft-model" : "");
    setTestStatus(null);
  };

  const activePreset = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const effectiveModel = React.useMemo(() => {
    if (model === "custom") {
      return customModelInput.trim() || activePreset.defaultModel;
    }
    if ((provider === "codecraft" || baseUrl.includes("codecraft")) && (!model || model === "gpt-4o-mini")) {
      return "gemini-3.7-flash";
    }
    return model || activePreset.defaultModel;
  }, [model, customModelInput, activePreset, provider, baseUrl]);

  // Save config and close popup
  const handleSave = (closeImmediately: boolean = true) => {
    const trimmedKey = apiKey.trim();
    if (typeof window !== "undefined") {
      if (trimmedKey || provider === "universal" || provider === "codecraft") {
        const config = {
          provider,
          apiKey: trimmedKey,
          baseUrl: baseUrl.trim(),
          model: effectiveModel,
        };

        const serialized = JSON.stringify(config);
        localStorage.setItem("markly_ai_config", serialized);
        localStorage.setItem("markly_gemini_api_key", trimmedKey);

        document.cookie = `markly_ai_config=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `markly_gemini_api_key=${encodeURIComponent(trimmedKey)}; path=/; max-age=31536000; SameSite=Lax`;

        setIsSaved(true);
        setTestStatus({
          success: true,
          message: `${activePreset.name} (${effectiveModel}) configured and saved successfully!`,
        });

        if (closeImmediately) {
          onOpenChange(false);
        }
      } else {
        handleClear();
        if (closeImmediately) {
          onOpenChange(false);
        }
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
    if (!trimmedKey && provider !== "universal") {
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
        // Sanitize model name (strip any models/ prefix)
        let cleanModel = (effectiveModel || "gemini-flash-latest").replace(/^models\//, "");
        if (cleanModel === "gemini-1.5-flash" || cleanModel === "gemini-1.5-pro") {
          cleanModel = "gemini-flash-latest";
        }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${trimmedKey}`,
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
            message: `Verified! Google Gemini API key is valid and connected to ${cleanModel}.`,
          });
          handleSave(false);
        } else {
          const errMsg = data.error?.message || "Invalid Gemini key or quota exceeded.";
          setTestStatus({
            success: false,
            message: `Gemini verification failed: ${errMsg}`,
          });
        }
      } else {
        // OpenAI-Compatible Providers (OpenRouter, Grok, Universal, CodeCraft, Ollama)
        const cleanBase = (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
        const cleanUrl = cleanBase.endsWith("/chat/completions") ? cleanBase : `${cleanBase}/chat/completions`;

        const res = await fetch(cleanUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${trimmedKey}`,
            "HTTP-Referer": "https://markly.app",
            "X-Title": "Markly",
          },
          body: JSON.stringify({
            model: effectiveModel || "gpt-4o-mini",
            messages: [{ role: "user", content: "Say 'Ready'" }],
            max_tokens: 10,
          }),
        });

        const data = await res.json();
        if (res.ok && data.choices?.[0]?.message?.content) {
          setTestStatus({
            success: true,
            message: `Verified! ${activePreset.name} (${effectiveModel}) is active and responding.`,
          });
          handleSave(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-[#181818] border-2 border-slate-200 dark:border-neutral-800 shadow-2xl rounded-3xl animate-in zoom-in-95">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white relative">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl mx-auto shadow-inner border border-white/30 mb-3">
            <Sparkles className="h-6 w-6 text-yellow-300" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-center text-white">
            Universal AI Configuration
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80 mt-1 max-w-sm mx-auto text-center">
            One single hub to connect Google Gemini, Grok, OpenRouter, or custom APIs like CodeCraft.
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
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-muted-foreground truncate max-w-44">
              {isSaved ? effectiveModel : "heuristic taxonomy"}
            </span>
          </div>

          {/* 1. Single Universal Provider Selector Dropdown (No 4 Tabs!) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-indigo-500" />
              <span>Select AI Platform</span>
            </label>
            <select
              value={provider}
              onChange={(e) => handleSelectProvider(e.target.value as ProviderType)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.badge})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Custom Base URL (Required for Universal / CodeCraft / Local AI) */}
          {provider === "universal" ? (
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                <span>API Base URL (Required for Custom / CodeCraft)</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="e.g. https://api.codecraft.com/v1 or http://localhost:11434/v1"
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Enter your CodeCraft, Ollama, DeepSeek, or any OpenAI-compatible API base endpoint.
              </p>
            </div>
          ) : null}

          {/* 3. API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                <span>{activePreset.name} API Key</span>
              </label>
              {provider !== "universal" && (
                <a
                  href={activePreset.keyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Get key from {activePreset.keyLabel}</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
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

          {/* 4. Model Selection Input / Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>Model Name</span>
            </label>

            {provider === "universal" ? (
              <input
                type="text"
                placeholder="e.g. codecraft-model, deepseek-chat, llama3, gpt-4o-mini"
                value={customModelInput || (model === "custom" ? "" : model)}
                onChange={(e) => {
                  setCustomModelInput(e.target.value);
                  setModel("custom");
                  setIsSaved(false);
                }}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono"
              />
            ) : (
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {activePreset.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}

            {provider !== "universal" && model === "custom" && (
              <div className="pt-1.5">
                <input
                  type="text"
                  placeholder="Type custom model identifier..."
                  value={customModelInput}
                  onChange={(e) => {
                    setCustomModelInput(e.target.value);
                    setIsSaved(false);
                  }}
                  className="w-full h-8 px-3 text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono"
                />
              </div>
            )}
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

          {/* Actions: Save Settings, Test Connection, Remove */}
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
                disabled={(!apiKey.trim() && provider !== "universal") || isTesting}
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
                onClick={() => handleSave(true)}
                disabled={!apiKey.trim() && provider !== "universal"}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
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
