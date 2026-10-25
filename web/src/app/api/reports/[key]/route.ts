import { logEvent } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getReport, reportFilters, toCSV } from "@/lib/data/reports";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await getCurrentUser();
  const { key } = await params;
  const report = getReport(key);
  if (!user || !can(user, "reports:export")) return new Response("Forbidden", { status: 403 });
  if (!report) return new Response("Not found", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const f = reportFilters(user, (k) => sp.get(k) || undefined);
  const result = await report.run(user, f);
  await logEvent(user, { entityType: "report", entityId: key, kind: "export", message: `Exported "${report.title}" as CSV (${result.rows.length} rows).` });
  return new Response(toCSV(result), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mntflow-${key}-${f.asOf}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
