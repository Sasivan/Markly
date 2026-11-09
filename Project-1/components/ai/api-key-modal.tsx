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
} from "lucide-react";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load API key from localStorage on mount or open
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("markly_gemini_api_key") || "";
      setApiKey(stored);
      setIsSaved(Boolean(stored));
      setTestStatus(null);
    }
  }, [open]);

  // Save key
  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (typeof window !== "undefined") {
      if (trimmed) {
        localStorage.setItem("markly_gemini_api_key", trimmed);
        document.cookie = `markly_gemini_api_key=${encodeURIComponent(
          trimmed
        )}; path=/; max-age=31536000; SameSite=Lax`;
        setIsSaved(true);
        setTestStatus({
          success: true,
          message: "API Key saved successfully! Gemini AI is now enabled.",
        });
      } else {
        handleClear();
      }
    }
  };

  // Clear key
  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("markly_gemini_api_key");
      document.cookie = "markly_gemini_api_key=; path=/; max-age=0";
      setApiKey("");
      setIsSaved(false);
      setTestStatus({
        success: false,
        message: "Key removed. Using built-in offline classification engine.",
      });
    }
  };

  // Test Key with Gemini API
  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestStatus({
        success: false,
        message: "Please enter an API key first.",
      });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      // Test directly with Google Gemini generateContent endpoint
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToTest}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: "Respond with the word: Ready" }],
              },
            ],
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setTestStatus({
          success: true,
          message: "Verified! Your Gemini API key is valid and working.",
        });
        // Auto-save on successful test
        localStorage.setItem("markly_gemini_api_key", keyToTest);
        document.cookie = `markly_gemini_api_key=${encodeURIComponent(
          keyToTest
        )}; path=/; max-age=31536000; SameSite=Lax`;
        setIsSaved(true);
      } else {
        const errorMsg = data.error?.message || "Invalid API key or quota exceeded.";
        setTestStatus({
          success: false,
          message: `Verification failed: ${errorMsg}`,
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: `Network error verifying key: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-[#181818] border-2 border-slate-200 dark:border-neutral-800 shadow-2xl rounded-3xl animate-in zoom-in-95">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white relative">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl mx-auto shadow-inner border border-white/30 mb-3">
            <Sparkles className="h-6 w-6 text-yellow-300" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-center text-white">
            Gemini AI Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80 mt-1 max-w-xs mx-auto text-center">
            Configure your personal Google Gemini API key to activate smart folder classification and auto-tagging.
          </DialogDescription>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5">
          {/* Status Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isSaved ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="font-medium text-slate-700 dark:text-neutral-300">
                {isSaved ? "Custom Gemini API Active" : "Built-in Offline Engine (Free)"}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-muted-foreground">
              {isSaved ? "gemini-1.5-flash" : "heuristic taxonomy"}
            </span>
          </div>

          {/* Input field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                <span>Google Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>Get free key</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsSaved(false);
                  setTestStatus(null);
                }}
                className="w-full h-10 px-3.5 pr-20 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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
            <p className="text-[11px] text-muted-foreground">
              Your key is saved locally in your browser and used securely to auto-classify bookmarks.
            </p>
          </div>

          {/* Test Status feedback */}
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
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
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
                <span>Test Key</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Save Key
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
