import { db } from "@/lib/db";

export type EventInput = {
  entityType: string;
  entityId: string;
  customerId?: string | null;
  kind: string;
  message: string;
  source?: "user" | "import" | "system" | "portal";
  visibility?: "internal" | "customer";
};

/** Append-only activity / audit log. There is intentionally no update or delete API. */
export async function logEvent(user: { orgId: string; id?: string | null }, e: EventInput) {
  await db.activityEvent.create({
    data: {
      orgId: user.orgId,
      userId: user.id ?? null,
      entityType: e.entityType,
      entityId: e.entityId,
      customerId: e.customerId ?? null,
      kind: e.kind,
      message: e.message,
      source: e.source ?? "user",
      visibility: e.visibility ?? "internal",
    },
  });
}
