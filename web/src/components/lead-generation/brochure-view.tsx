"use client";

import { useState } from "react";
import { ExecutiveBrochure, EXECUTIVE_SHARE_TEXT } from "./brochures/executive-brochure";
import { ProblemSolutionBrochure, PROBLEM_SOLUTION_SHARE_TEXT } from "./brochures/problem-solution-brochure";
import { WhatsappMobileBrochure, WHATSAPP_MOBILE_SHARE_TEXT } from "./brochures/whatsapp-mobile-brochure";

const MAP = {
  executive: { render: ExecutiveBrochure, share: EXECUTIVE_SHARE_TEXT, title: "Executive / Corporate" },
  "problem-solution": { render: ProblemSolutionBrochure, share: PROBLEM_SOLUTION_SHARE_TEXT, title: "Problem → Solution → Result" },
  "whatsapp-mobile": { render: WhatsappMobileBrochure, share: WHATSAPP_MOBILE_SHARE_TEXT, title: "WhatsApp / Mobile" },
} as const;

export type BrochureId = keyof typeof MAP;

export function BrochureView({ id }: { id: BrochureId }) {
  const cfg = MAP[id];
  const Brochure = cfg.render;
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">DEMO BROCHURE · {cfg.title}</span>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={async () => {
            await navigator.clipboard.writeText(cfg.share);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied share text" : "Copy share summary"}
        </button>
      </div>
      <Brochure />
    </div>
  );
}
