import { db } from "@/lib/db";

/** Indian fiscal-year label for a YYYY-MM-DD date, e.g. 2026-10-25 → "26-27" (FY starts in April). */
export function fyLabel(iso: string, startMonth = 4): string {
  const y = Number(iso.slice(0, 4));
  const start = Number(iso.slice(5, 7)) >= startMonth ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

/** Next sequential document number like SO/26-27/0312 (sequence continues across the organization). */
export async function nextNumber(orgId: string, kind: "quotation" | "order" | "issue", today: string): Promise<string> {
  if (kind === "issue") {
    const rows = await db.issue.findMany({ where: { orgId }, select: { number: true } });
    const max = Math.max(1000, ...rows.map((r) => Number(r.number.replace(/\D/g, "")) || 0));
    return `ISS-${max + 1}`;
  }
  const prefix = kind === "quotation" ? "QT" : "SO";
  const rows = kind === "quotation"
    ? await db.quotation.findMany({ where: { orgId }, select: { number: true } })
    : await db.salesOrder.findMany({ where: { orgId }, select: { number: true } });
  const max = Math.max(0, ...rows.map((r) => Number(r.number.split("/").pop()) || 0));
  return `${prefix}/${fyLabel(today)}/${String(max + 1).padStart(4, "0")}`;
}
