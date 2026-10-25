"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { authorize } from "@/lib/auth/session";
import { ENTITIES, type EntityType } from "@/lib/import/fields";
import { commitRows, orgTotals, rollbackBatch, validateImport, type ImportSummary, type RowResult } from "@/lib/import/engine";
import { run, UserError, type ActionState } from "./run";

type Slim = Omit<RowResult, "data">;
export type DryRunResult = { summary: ImportSummary; results: Slim[] } | { error: string };
export type CommitResult = { batchId: string; summary: ImportSummary; before: Awaited<ReturnType<typeof orgTotals>>; after: Awaited<ReturnType<typeof orgTotals>> } | { error: string };

function checkEntity(e: string): EntityType {
  if (!ENTITIES.some((x) => x.value === e)) throw new UserError("Unknown import type.");
  return e as EntityType;
}

function cleanRows(rows: unknown): Record<string, string>[] {
  if (!Array.isArray(rows)) throw new UserError("Invalid rows.");
  return rows.map((r) => Object.fromEntries(Object.entries((r ?? {}) as Record<string, unknown>).map(([k, v]) => [String(k).slice(0, 60), String(v ?? "").slice(0, 1000)])));
}

export async function dryRunImport(entity: string, rows: unknown, updateExisting: boolean): Promise<DryRunResult> {
  try {
    const user = await authorize("imports:run");
    const { results, summary } = await validateImport(user, checkEntity(entity), cleanRows(rows), !!updateExisting);
    return { summary, results: results.map(({ data: _d, ...r }) => r) };
  } catch (e) {
    return { error: e instanceof UserError || (e instanceof Error && e.message.startsWith("Files are limited")) ? e.message : "Validation failed. Check the file and try again." };
  }
}

export async function commitImport(entity: string, fileName: string, rows: unknown, updateExisting: boolean): Promise<CommitResult> {
  try {
    const user = await authorize("imports:run");
    const ent = checkEntity(entity);
    const { results, summary } = await validateImport(user, ent, cleanRows(rows), !!updateExisting);
    if (summary.create + summary.update === 0) return { error: "Nothing to import: every row is a duplicate or was rejected." };
    const before = await orgTotals(user.orgId);
    const batch = await db.importBatch.create({ data: { orgId: user.orgId, entityType: ent, fileName: String(fileName).slice(0, 200), createdById: user.id, summaryJson: "{}" } });
    try {
      await commitRows(user, ent, batch.id, results);
    } catch (e) {
      await db.importBatch.delete({ where: { id: batch.id } });
      throw e;
    }
    const after = await orgTotals(user.orgId);
    const rejected = results.filter((r) => r.action === "reject").slice(0, 200).map((r) => ({ row: r.row, errors: r.errors }));
    await db.importBatch.update({ where: { id: batch.id }, data: { summaryJson: JSON.stringify({ ...summary, before, after, rejected, updateExisting: !!updateExisting }) } });
    await logEvent(user, { entityType: "import", entityId: batch.id, kind: "import", source: "import", message: `Imported ${ent} from ${fileName}: ${summary.create} created, ${summary.update} updated, ${summary.skip} skipped, ${summary.reject} rejected.` });
    revalidatePath("/imports");
    return { batchId: batch.id, summary, before, after };
  } catch (e) {
    console.error("[import]", e instanceof Error ? e.message : e);
    return { error: e instanceof UserError ? e.message : "Import failed and no records were written. Please re-validate and try again." };
  }
}

export async function rollbackImport(batchId: string, _: ActionState, __: FormData) {
  return run(async () => {
    const user = await authorize("imports:run");
    const b = await db.importBatch.findFirst({ where: { id: batchId, orgId: user.orgId } });
    if (!b) throw new UserError("Import batch not found.");
    if (b.status !== "committed") throw new UserError("This batch has already been rolled back.");
    let n: number;
    try {
      n = await rollbackBatch(user.orgId, b.id, b.entityType as EntityType);
    } catch (e) {
      throw new UserError(e instanceof Error ? e.message : "Rollback not possible.");
    }
    await db.importBatch.update({ where: { id: b.id }, data: { status: "rolled_back" } });
    await logEvent(user, { entityType: "import", entityId: b.id, kind: "import", source: "user", message: `Rolled back import ${b.fileName}: ${n} created record(s) removed. Updates to existing records are not reversed.` });
    revalidatePath("/imports");
    return `Rolled back: ${n} record(s) removed.`;
  });
}
