"use client";

import * as React from "react";
import {
  MessageSquarePlus,
  Send,
  Sparkles,
  Bug,
  TrendingUp,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FeedbackWithReplies } from "@/server/db/schema";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; darkBg: string }
> = {
  received: {
    label: "Received",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  under_review: {
    label: "Under Review",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
  },
  processing: {
    label: "In Processing",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50",
    darkBg: "dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
  },
  fixed: {
    label: "Fixed",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50",
    darkBg: "dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  planned: {
    label: "Planned",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50",
    darkBg: "dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  closed: {
    label: "Closed",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100",
    darkBg: "dark:bg-neutral-800",
    border: "border-slate-300 dark:border-neutral-700",
  },
};

const CATEGORIES = [
  { id: "general", label: "General", icon: MessageSquarePlus },
  { id: "feature", label: "Feature Idea", icon: Sparkles },
  { id: "bug", label: "Bug Report", icon: Bug },
  { id: "improvement", label: "Improvement", icon: TrendingUp },
];

interface FeedbackViewProps {
  onNavigateHome?: () => void;
}

export function FeedbackView({ onNavigateHome }: FeedbackViewProps) {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [myFeedback, setMyFeedback] = React.useState<FeedbackWithReplies[]>([]);
  const [allFeedback, setAllFeedback] = React.useState<FeedbackWithReplies[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [category, setCategory] = React.useState<"general" | "feature" | "bug" | "improvement">("general");
  const [formError, setFormError] = React.useState("");
  const [formSuccess, setFormSuccess] = React.useState("");

  // Thread Reply State
  const [activeReplyId, setActiveReplyId] = React.useState<string | null>(null);
  const [replyMessage, setReplyMessage] = React.useState("");
  const [isReplying, setIsReplying] = React.useState(false);

  // Expanded cards
  const [expandedCards, setExpandedCards] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/feedback", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(!!data.isAdmin);
        setMyFeedback(data.myFeedback || []);
        setAllFeedback(data.allFeedback || []);
      }
    } catch (e) {
      console.error("Failed to load feedbacks:", e);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!title.trim() || title.trim().length < 3) {
      setFormError("Please enter a title (at least 3 characters).");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setFormError("Please enter detailed feedback (at least 5 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, category }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to submit feedback.");
        return;
      }

      setFormSuccess("Thank you! Your feedback has been sent directly to our team.");
      setTitle("");
      setMessage("");
      setCategory("general");
      await loadFeedbacks();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (feedbackId: string) => {
    if (!replyMessage.trim()) return;

    try {
      setIsReplying(true);
      const res = await fetch(`/api/feedback/${feedbackId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });

      if (res.ok) {
        setReplyMessage("");
        setActiveReplyId(null);
        await loadFeedbacks();
      }
    } catch (e) {
      console.error("Failed to send reply:", e);
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await loadFeedbacks();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const renderFeedbackItem = (item: FeedbackWithReplies, showUser = false) => {
    const isExpanded = expandedCards[item.id] ?? true;
    const repliesCount = item.replies?.length || 0;
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.received;

    return (
      <div
        key={item.id}
        className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-4 shadow-2xs space-y-3 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.darkBg} ${statusCfg.border}`}
            >
              {statusCfg.label}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] capitalize border-slate-200 dark:border-neutral-700 text-muted-foreground"
            >
              {item.category}
            </Badge>
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground mr-1">Admin Tag:</span>
              {["received", "under_review", "processing", "fixed", "planned", "closed"].map((st) => {
                const cfg = STATUS_CONFIG[st];
                const active = item.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(item.id, st)}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors font-medium ${
                      active
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-slate-100 dark:bg-neutral-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>{item.title}</span>
            <button
              type="button"
              onClick={() => toggleExpand(item.id)}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </h4>
          <p className="text-xs text-slate-700 dark:text-neutral-300 mt-1 whitespace-pre-wrap leading-relaxed">
            {item.message}
          </p>

          {showUser && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-neutral-850 text-[11px] text-muted-foreground">
              <UserIcon className="h-3 w-3" />
              <span className="font-medium text-slate-800 dark:text-neutral-200">{item.userName || "User"}</span>
              {item.userEmail && <span>({item.userEmail})</span>}
            </div>
          )}
        </div>

        {/* Reply Threads */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 space-y-2.5">
            {repliesCount > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Conversation Thread ({repliesCount})
                </span>
                <div className="space-y-2 pl-3 border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-1">
                  {item.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-2.5 rounded-lg text-xs space-y-1 ${
                        reply.isAdmin
                          ? "bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40"
                          : "bg-slate-50 dark:bg-neutral-850 border border-slate-100 dark:border-neutral-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {reply.userName || (reply.isAdmin ? "Admin (Sasivan)" : "User")}
                          </span>
                          {reply.isAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white flex items-center gap-0.5">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(reply.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Reply Form */}
            {activeReplyId === item.id ? (
              <div className="pt-1 space-y-2">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={isAdmin ? "Type your official admin response..." : "Add a reply to this thread..."}
                  rows={2}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 p-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActiveReplyId(null);
                      setReplyMessage("");
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSendReply(item.id)}
                    disabled={isReplying || !replyMessage.trim()}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    {isReplying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                    Reply
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveReplyId(item.id);
                  setReplyMessage("");
                }}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <MessageSquarePlus className="h-3 w-3" />
                {isAdmin ? "Write back as Admin" : "Reply to thread"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1">
              <MessageSquarePlus className="h-3 w-3" />
              Community & Support
            </span>
            {isAdmin && (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-mono px-2 py-0 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Admin: sasivan177@gmail.com
              </Badge>
            )}
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Feedback & Feature Requests
          </h1>
          <p className="text-xs text-muted-foreground">
            Share ideas, report bugs, or request features. All submissions are reviewed directly by the development team.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadFeedbacks}
          disabled={isLoading}
          className="h-8 text-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Submission Box */}
      <div className="rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Send New Feedback
          </h2>
          <span className="text-[11px] text-muted-foreground font-mono">
            Directly stored in database
          </span>
        </div>

        {formError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Category Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block mb-1.5">
              Select Category
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 dark:bg-neutral-850 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Folder tree drag & drop performance or custom icons"
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 px-3 py-2 text-slate-900 dark:text-white placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block mb-1">
              Description & Details
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide as much context as possible. Include steps to reproduce for bugs, or use cases for feature ideas..."
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 p-3 text-slate-900 dark:text-white placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-8 px-4 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Submit Feedback</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Admin Review Dashboard (Visible only to sasivan177@gmail.com) */}
      {isAdmin && (
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/10 dark:bg-emerald-950/20 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/40 dark:border-emerald-800/40 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Admin Feedback Moderation (All Users)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Triage incoming feedback, reply to user threads, and update status tags (Fixed, Processing, Under Review).
              </p>
            </div>
            <Badge className="bg-emerald-600 text-white text-xs font-mono self-start sm:self-auto">
              {allFeedback.length} Total Tickets
            </Badge>
          </div>

          {allFeedback.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No user tickets in the system yet.
            </div>
          ) : (
            <div className="space-y-3">
              {allFeedback.map((item) => renderFeedbackItem(item, true))}
            </div>
          )}
        </div>
      )}

      {/* User's Submitted Feedback History */}
      <div className="rounded-2xl border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              My Feedback Submissions
            </h3>
            <p className="text-xs text-muted-foreground">
              Track the status of your submitted tickets and read admin replies.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {myFeedback.length} {myFeedback.length === 1 ? "ticket" : "tickets"}
          </Badge>
        </div>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Loading submissions...</span>
          </div>
        ) : myFeedback.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-xs text-muted-foreground">
              You haven't submitted any feedback yet. We'd love to hear your thoughts!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myFeedback.map((item) => renderFeedbackItem(item, false))}
          </div>
        )}
      </div>
    </div>
  );
}

