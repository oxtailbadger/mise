"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function HouseholdNameClient() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/household")
      .then((r) => r.json())
      .then((data) => { setName(data.name); })
      .catch(() => toast.error("Could not load household name"))
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setDraft(name);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft("");
  }

  async function saveEdit() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/household", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setName(data.name);
      setEditing(false);
      toast.success("Household name updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-9 bg-muted rounded-lg animate-pulse" />;
  }

  if (editing) {
    return (
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") cancelEdit();
          }}
          className="h-9 flex-1"
          autoFocus
          maxLength={40}
          placeholder="e.g. Stanton"
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={saveEdit}
          disabled={saving || !draft.trim()}
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Check className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          onClick={cancelEdit}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">
        {name && name !== "your" ? (
          <><span className="font-medium">{name}</span> household</>
        ) : (
          <span className="text-muted-foreground italic">Not set</span>
        )}
      </span>
      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={startEdit}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
    </div>
  );
}
