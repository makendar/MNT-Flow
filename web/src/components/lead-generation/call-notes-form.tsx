"use client";

import { useEffect, useState } from "react";
import { EMPTY_CALL_NOTES, type CallNotes } from "@/lib/lead-generation/types";
import { Field } from "@/components/ui";

const keyFor = (leadId: string) => `mnt-leadgen-call-notes-${leadId}`;

export function CallNotesForm({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<CallNotes>(EMPTY_CALL_NOTES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(leadId));
      if (raw) setNotes(JSON.parse(raw) as CallNotes);
    } catch {
      /* ignore */
    }
  }, [leadId]);

  const update = (field: keyof CallNotes, value: string) => setNotes((n) => ({ ...n, [field]: value }));

  return (
    <section className="card">
      <div className="card-h">
        <h2 className="card-t">Call notes</h2>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => {
            localStorage.setItem(keyFor(leadId), JSON.stringify(notes));
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
        >
          {saved ? "Saved" : "Save notes (this browser)"}
        </button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {(
          [
            ["painPoints", "Pain points"],
            ["requirements", "Requirements"],
            ["decisionMakers", "Decision makers"],
            ["timeline", "Timeline"],
            ["questions", "Questions"],
            ["nextAction", "Next action"],
            ["followUpDate", "Follow-up date"],
          ] as const
        ).map(([field, label]) => (
          <Field key={field} label={label} className={field === "questions" ? "sm:col-span-2" : ""}>
            <textarea
              className="input min-h-[72px]"
              value={notes[field]}
              onChange={(e) => update(field, e.target.value)}
              aria-label={label}
            />
          </Field>
        ))}
      </div>
    </section>
  );
}
