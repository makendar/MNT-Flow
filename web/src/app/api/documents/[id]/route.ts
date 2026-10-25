import { db } from "@/lib/db";
import { logEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const doc = await db.document.findFirst({ where: { id, orgId: user.orgId } });
  // Portal users may only download documents explicitly shared with their own customer account.
  if (!doc || (user.role === "customer_portal" && (doc.customerId !== user.customerId || !doc.sharedWithCustomer))) {
    return new Response("Not found", { status: 404 });
  }
  let body: Buffer;
  let type = doc.mimeType;
  if (doc.isSynthetic || !doc.storageKey) {
    body = Buffer.from(`SYNTHETIC DEMO DOCUMENT\n\nFile: ${doc.fileName}\nType: ${doc.type}\n\nThis placeholder stands in for a real document in the MNT Flow demo dataset. No real data is contained here.\n`);
    type = "text/plain";
  } else {
    try {
      body = await readStoredFile(user.orgId, doc.storageKey);
    } catch {
      return new Response("File missing from storage", { status: 410 });
    }
  }
  await logEvent(user, { entityType: "document", entityId: doc.id, customerId: doc.customerId, kind: "download", source: user.role === "customer_portal" ? "portal" : "user", message: `Downloaded ${doc.fileName}` });
  const name = doc.isSynthetic ? `${doc.fileName}.txt` : doc.fileName;
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
