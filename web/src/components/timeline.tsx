import Link from "next/link";
import { Badge, Empty, SourceBadge } from "./ui";
import { fmtDateTime } from "@/lib/dates";
import { entityHref } from "@/lib/links";

type Ev = { id: string; kind: string; source: string; visibility: string; message: string; createdAt: Date; userId: string | null; entityType: string; entityId: string };

export function Timeline({ events, users, showEntity, showVisibility = true }: { events: Ev[]; users: Map<string, string>; showEntity?: boolean; showVisibility?: boolean }) {
  if (!events.length) return <Empty title="No activity yet" />;
  return (
    <ol className="relative space-y-3 border-l border-slate-200 pl-4">
      {events.map((e) => {
        const href = showEntity ? entityHref(e.entityType, e.entityId) : null;
        return (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${e.source === "import" ? "bg-violet-500" : e.source === "system" ? "bg-slate-400" : e.source === "portal" ? "bg-teal-500" : "bg-blue-600"}`} />
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <SourceBadge source={e.source} />
              {e.kind === "comment" && <Badge>Comment</Badge>}
              {showVisibility && e.visibility === "customer" && <Badge tone="teal">Visible to customer</Badge>}
              <span>{fmtDateTime(e.createdAt)}</span>
              {e.userId && <span>· {users.get(e.userId) ?? "Customer user"}</span>}
              {href && <Link href={href} className="link">· {e.entityType}</Link>}
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-slate-800">{e.message}</p>
          </li>
        );
      })}
    </ol>
  );
}
