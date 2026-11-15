"use client";

import * as React from "react";
import { StickyNote, Copy, Check, Trash2, Eye, EyeOff, Plus, Edit2 } from "lucide-react";

export interface ScratchNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const DEFAULT_NOTE: ScratchNote = {
  id: "note-default",
  title: "General Notes",
  content: "",
  updatedAt: Date.now(),
};

interface ScratchpadWidgetProps {
  bare?: boolean;
}

export function ScratchpadWidget({ bare = false }: ScratchpadWidgetProps) {
  const [notes, setNotes] = React.useState<ScratchNote[]>([DEFAULT_NOTE]);
  const [activeNoteId, setActiveNoteId] = React.useState<string>("note-default");
  const [previewMode, setPreviewMode] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);

  // Load notes from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("markly_scratchpad_notes");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          setActiveNoteId(parsed[0].id);
          return;
        }
      }
      // Migrate legacy single note if present
      const legacy = localStorage.getItem("markly_home_scratchpad");
      if (legacy) {
        const initialNote: ScratchNote = {
          id: "note-1",
          title: "My Notes",
          content: legacy,
          updatedAt: Date.now(),
        };
        setNotes([initialNote]);
        setActiveNoteId(initialNote.id);
        localStorage.setItem("markly_scratchpad_notes", JSON.stringify([initialNote]));
      }
    } catch {}
  }, []);

  const activeNote = React.useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || notes[0] || DEFAULT_NOTE;
  }, [notes, activeNoteId]);

  const saveNotes = (updated: ScratchNote[]) => {
    setNotes(updated);
    try {
      localStorage.setItem("markly_scratchpad_notes", JSON.stringify(updated));
      setLastSaved("Saved just now");
    } catch {}
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const updated = notes.map((n) =>
      n.id === activeNote.id ? { ...n, content: val, updatedAt: Date.now() } : n
    );
    saveNotes(updated);
  };

  const handleTitleChange = (newTitle: string) => {
    const updated = notes.map((n) =>
      n.id === activeNote.id ? { ...n, title: newTitle.trim() || "Untitled Note", updatedAt: Date.now() } : n
    );
    saveNotes(updated);
  };

  const handleAddNote = () => {
    const newId = `note-${Date.now()}`;
    const newNote: ScratchNote = {
      id: newId,
      title: `Note ${notes.length + 1}`,
      content: "",
      updatedAt: Date.now(),
    };
    const updated = [...notes, newNote];
    saveNotes(updated);
    setActiveNoteId(newId);
    setPreviewMode(false);
  };

  const handleDeleteActiveNote = () => {
    if (notes.length <= 1) {
      // Clear content of only remaining note
      const reset = [{ ...notes[0], content: "", title: "General Notes", updatedAt: Date.now() }];
      saveNotes(reset);
      return;
    }
    const updated = notes.filter((n) => n.id !== activeNote.id);
    saveNotes(updated);
    setActiveNoteId(updated[0].id);
  };

  const handleCopy = async () => {
    if (!activeNote.content.trim()) return;
    try {
      await navigator.clipboard.writeText(activeNote.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const wordsCount = React.useMemo(() => {
    return activeNote.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0;
  }, [activeNote.content]);

  return (
    <div className={bare ? "p-4 space-y-3" : "rounded-xl border border-border bg-card p-4 shadow-xs space-y-3"}>
      {/* Note Tabs & Actions */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5 flex-wrap">
        {/* Left: Scrollable Note Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[70%] scrollbar-none py-0.5">
          {notes.map((note) => {
            const isActive = note.id === activeNote.id;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  setActiveNoteId(note.id);
                  setPreviewMode(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={note.title}
              >
                <StickyNote className="h-3 w-3" />
                <span className="truncate max-w-28">{note.title}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleAddNote}
            className="h-6 px-2 rounded-lg border border-dashed border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1 text-xs cursor-pointer transition-colors shrink-0"
            title="Create new note"
          >
            <Plus className="h-3 w-3" />
            <span>New Note</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreviewMode((prev) => !prev)}
            title={previewMode ? "Switch to Edit mode" : "Switch to Preview mode"}
            className="h-6 px-2 rounded-md border border-border bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
          >
            {previewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{previewMode ? "Edit" : "Preview"}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!activeNote.content.trim()}
            title="Copy notes to clipboard"
            className="h-6 px-2 rounded-md border border-border bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-1 cursor-pointer transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteActiveNote}
            title={notes.length > 1 ? `Delete "${activeNote.title}"` : "Clear content"}
            className="h-6 w-6 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Note Title Input */}
      <div className="flex items-center justify-between gap-2">
        {isEditingTitle ? (
          <input
            type="text"
            defaultValue={activeNote.title}
            autoFocus
            onBlur={(e) => {
              handleTitleChange(e.target.value);
              setIsEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTitleChange((e.target as HTMLInputElement).value);
                setIsEditingTitle(false);
              }
            }}
            className="h-6 text-xs font-semibold px-1.5 rounded border border-border bg-background text-foreground w-48"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary cursor-pointer group"
            title="Click to rename note"
          >
            <span>{activeNote.title}</span>
            <Edit2 className="h-2.5 w-2.5 text-muted-foreground opacity-60 group-hover:opacity-100" />
          </button>
        )}
        <span className="text-[10px] font-mono text-muted-foreground">
          {lastSaved || "Local storage • Offline"}
        </span>
      </div>

      {/* Editor / Preview Area */}
      <div>
        {previewMode ? (
          <div className="min-h-28 max-h-56 overflow-y-auto p-2.5 rounded-lg bg-secondary/30 border border-border text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
            {activeNote.content.trim() ? (
              activeNote.content
            ) : (
              <span className="text-muted-foreground italic">No notes written yet in this note. Switch to Edit to write.</span>
            )}
          </div>
        ) : (
          <textarea
            value={activeNote.content}
            onChange={handleContentChange}
            placeholder="Type quick thoughts, draft markdown links [Example](https://...), or paste snippets..."
            rows={4}
            className="w-full resize-y min-h-24 max-h-64 rounded-lg bg-background border border-input p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono leading-relaxed"
          />
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>{notes.length} {notes.length === 1 ? "note" : "notes"} in scratchpad</span>
        <span>
          {activeNote.content.length} chars • {wordsCount} words
        </span>
      </div>
    </div>
  );
}
