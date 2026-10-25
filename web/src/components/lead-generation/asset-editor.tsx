"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeadAsset } from "@/lib/lead-generation/types";
import { Badge } from "@/components/ui";

const OVERRIDES_KEY = "mnt-leadgen-asset-overrides";

function loadOverride(id: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}") as Record<string, string>;
    return all[id] ?? null;
  } catch {
    return null;
  }
}

function saveOverride(id: string, body: string) {
  const all = JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}") as Record<string, string>;
  all[id] = body;
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

function resetOverride(id: string) {
  const all = JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}") as Record<string, string>;
  delete all[id];
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(all));
}

export function AssetEditor({ asset, canEdit }: { asset: LeadAsset; canEdit: boolean }) {
  const [text, setText] = useState(asset.body);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const o = loadOverride(asset.id);
    if (o) setText(o);
  }, [asset.id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {asset.meta?.touch != null && <Badge tone="blue">Touch {asset.meta.touch}</Badge>}
        {asset.requiresLegalReview && <Badge tone="amber">Legal / business review required</Badge>}
        {asset.brochureId && (
          <Link href={`/lead-generation/brochures/${asset.brochureId}`} className="btn btn-sm btn-primary">
            Open visual brochure
          </Link>
        )}
      </div>
      {asset.meta && (
        <dl className="dl card p-4">
          {asset.meta.subject && (
            <>
              <dt>Subject</dt>
              <dd>{asset.meta.subject}</dd>
            </>
          )}
          {asset.meta.subjectAlt && (
            <>
              <dt>Alt subject</dt>
              <dd>{asset.meta.subjectAlt}</dd>
            </>
          )}
          {asset.meta.cta && (
            <>
              <dt>CTA</dt>
              <dd>{asset.meta.cta}</dd>
            </>
          )}
          {asset.meta.attachment && (
            <>
              <dt>Attachment</dt>
              <dd>{asset.meta.attachment}</dd>
            </>
          )}
        </dl>
      )}
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="label mb-0">Content — preview & edit</span>
          <span className="text-[11px] text-slate-500">Templates are not sent from MNT Flow.</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={!canEdit}
          rows={18}
          className="input font-mono text-xs leading-relaxed"
          aria-label={`${asset.title} body`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy to clipboard"}
        </button>
        {canEdit && (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                saveOverride(asset.id, text);
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
              }}
            >
              {saved ? "Saved locally" : "Save edits (this browser)"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                resetOverride(asset.id);
                setText(asset.body);
              }}
            >
              Reset to default
            </button>
          </>
        )}
      </div>
      <PreviewMarkdown text={text} />
    </div>
  );
}

function PreviewMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <section className="card">
      <div className="card-h">
        <h2 className="card-t">Readable preview</h2>
      </div>
      <div className="prose prose-sm max-w-none p-4 text-slate-700">
        {lines.map((line, i) => {
          if (line.startsWith("# ")) return <h3 key={i} className="text-base font-semibold text-slate-900">{line.slice(2)}</h3>;
          if (line.startsWith("## ")) return <h4 key={i} className="mt-3 text-sm font-semibold text-slate-900">{line.slice(3)}</h4>;
          if (line.startsWith("- ☐")) return <p key={i} className="text-[13px]">{line}</p>;
          if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="ml-4 list-disc text-[13px]">{line.replace(/^[-•]\s*/, "")}</li>;
          if (line.trim() === "") return <br key={i} />;
          if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
          return <p key={i} className="text-[13px] leading-relaxed">{line}</p>;
        })}
      </div>
    </section>
  );
}
