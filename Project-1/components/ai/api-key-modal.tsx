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
} from "lucide-react";

export interface GeminiModelOption {
  id: string;
  label: string;
  desc: string;
}

const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-flash-latest",
    label: "gemini-flash-latest (Recommended)",
    desc: "Fast, accurate, Google's latest active Flash model (Free Tier)",
  },
  {
    id: "gemini-2.5-flash",
    label: "gemini-2.5-flash (Next-Gen Flash)",
    desc: "Google's updated multimodal Flash model",
  },
  {
    id: "gemini-2.5-pro",
    label: "gemini-2.5-pro (Deep Reasoning)",
    desc: "High reasoning capacity and extensive context window",
  },
  {
    id: "gemini-flash-lite",
    label: "gemini-flash-lite (Ultra Fast)",
    desc: "Lightweight, ultra low-latency Flash model",
  },
  {
    id: "custom",
    label: "Custom Gemini Model...",
    desc: "Type custom Google Gemini model ID",
  },
];

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("gemini-flash-latest");
  const [customModelInput, setCustomModelInput] = React.useState("");

  const [showKey, setShowKey] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load configuration from localStorage / cookies on modal open
  React.useEffect(() => {
    if (open && typeof window !== "undefined") {
      const storedKey =
        localStorage.getItem("markly_gemini_api_key") ||
        getCookie("markly_gemini_api_key") ||
        "";

      const storedConfig =
        localStorage.getItem("markly_ai_config") ||
        getCookie("markly_ai_config") ||
        "";

      if (storedKey) {
        setApiKey(storedKey);
        setIsSaved(true);
      } else {
        setApiKey("");
        setIsSaved(false);
      }

      if (storedConfig) {
        try {
          const parsed = JSON.parse(storedConfig);
          if (parsed.model) {
            let m = parsed.model.replace(/^models\//, "");
            if (m === "gemini-1.5-flash" || m === "gemini-1.5-pro") {
              m = "gemini-flash-latest";
            }
            const known = GEMINI_MODELS.some((item) => item.id === m);
            if (known) {
              setModel(m);
            } else {
              setModel("custom");
              setCustomModelInput(m);
            }
          }
        } catch {}
      }

      setTestStatus(null);
    }
  }, [open, user?.email]);

  const effectiveModel = React.useMemo(() => {
    if (model === "custom") {
      return customModelInput.trim() || "gemini-flash-latest";
    }
    return model || "gemini-flash-latest";
  }, [model, customModelInput]);

  // Save config to localStorage & cookies (persists for 1 year across all sessions)
  const handleSave = (closeImmediately: boolean = true) => {
    const trimmedKey = apiKey.trim();
    if (typeof window !== "undefined") {
      if (trimmedKey) {
        const config = {
          provider: "gemini",
          apiKey: trimmedKey,
          model: effectiveModel,
        };

        const serialized = JSON.stringify(config);
        localStorage.setItem("markly_ai_config", serialized);
        localStorage.setItem("markly_gemini_api_key", trimmedKey);

        // 1-year persistent cookie for SSR and API routes
        document.cookie = `markly_ai_config=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `markly_gemini_api_key=${encodeURIComponent(trimmedKey)}; path=/; max-age=31536000; SameSite=Lax`;

        setIsSaved(true);
        setTestStatus({
          success: true,
          message: `Google Gemini (${effectiveModel}) configured and saved for all sessions!`,
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
        message: "API key removed. Using built-in offline classification engine.",
      });
    }
  };

  // Live Test Key directly against Google AI Studio API
  const handleTestKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setTestStatus({
        success: false,
        message: "Please enter your Google Gemini API key first.",
      });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      let cleanModel = effectiveModel.replace(/^models\//, "");
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
        const errMsg = data.error?.message || "Invalid Gemini API key or quota exceeded.";
        setTestStatus({
          success: false,
          message: `Gemini verification failed: ${errMsg}`,
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: `Network error connecting to Google Gemini: ${err.message || "Please check connection"}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-2xl rounded-2xl bg-white dark:bg-[#151515]">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white text-center relative overflow-hidden flex-shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-2 border border-white/20 shadow-xs">
            <Sparkles className="h-4.5 w-4.5 text-amber-300" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-center text-white">
            Google Gemini AI Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80 mt-0.5 max-w-sm mx-auto text-center">
            Connect your personal Google Gemini API key to unlock automated tag extraction, category classification, and smart bookmark suggestions.
          </DialogDescription>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isSaved ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="font-medium text-slate-700 dark:text-neutral-300">
                {isSaved ? "Google Gemini AI Active" : "Offline Engine (Heuristic)"}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-muted-foreground truncate max-w-44">
              {isSaved ? effectiveModel : "free taxonomy"}
            </span>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-blue-500" />
                <span>Google Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                <span>Get free Gemini key from Google AI Studio</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy... or AQ.Ab8..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsSaved(false);
                  setTestStatus(null);
                }}
                className="w-full h-10 px-3.5 pr-20 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-md cursor-pointer"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Every user provides their own key. Your key is stored securely in your browser and used only to categorize your bookmarks.
            </p>
          </div>

          {/* Model Selector Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              <span>Gemini Model</span>
            </label>
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setIsSaved(false);
                setTestStatus(null);
              }}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            {model === "custom" && (
              <input
                type="text"
                placeholder="Enter custom Gemini model (e.g. gemini-2.0-flash)"
                value={customModelInput}
                onChange={(e) => {
                  setCustomModelInput(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full h-8 px-3 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white font-mono mt-1.5"
              />
            )}
          </div>

          {/* Test Status Feedback Banner */}
          {testStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                testStatus.success
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300"
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 font-medium">{testStatus.message}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-neutral-800/80">
            {apiKey.trim() || isSaved ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer flex items-center gap-1 font-medium"
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
                  <Cpu className="h-3 w-3 text-blue-500" />
                )}
                <span>Test Connection</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSave(true)}
                disabled={!apiKey.trim()}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
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

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) {
    try {
      return decodeURIComponent(match[2]);
    } catch {
      return match[2];
    }
  }
  return null;
}
