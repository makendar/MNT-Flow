// Import engine self-check against the seeded demo database (read-only dry run). Run: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { db } from "../db";
import { todayISO } from "../dates";
import { parseSettings } from "../domain/settings";
import type { SessionUser } from "../auth/session";
import { autoMap, FIELDS } from "./fields";
import { parseMoney, validateImport } from "./engine";

assert.equal(parseMoney("₹1,25,000.50"), 125000.5);
assert.equal(parseMoney("Rs. 1,000"), 1000);
assert.equal(parseMoney("(500)"), null);
assert.equal(parseMoney("12.345"), null);

async function main() {
  const u = await db.user.findUnique({ where: { id: "usr_finmgr" }, include: { org: true } });
  if (!u) throw new Error("Seed the demo database first: npm run db:seed");
  const user: SessionUser = { id: u.id, name: u.name, email: u.email, role: u.role, team: u.team, orgId: u.orgId, customerId: null, org: { id: u.org.id, name: u.org.name, isDemo: true, timezone: u.org.timezone, address: u.org.address }, settings: parseSettings(u.org.settingsJson), today: todayISO() };

  const csv = readFileSync(path.join(process.cwd(), "public/samples/demo-invoices-import.csv"), "utf8");
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy" });
  const map = autoMap("invoices", parsed.meta.fields ?? []);
  for (const f of FIELDS.invoices.filter((x) => x.required)) assert.ok(map[f.key], `auto-map missing ${f.key}`);
  const rows = parsed.data.map((r) => Object.fromEntries(Object.entries(map).map(([k, h]) => [k, r[h]])));
  const { results, summary } = await validateImport(user, "invoices", rows, false);
  const byRow = (n: number) => results.find((r) => r.row === n)!;

  assert.equal(byRow(2).action, "create");
  assert.equal(byRow(3).action, "create"); // ₹2,10,500 with slashes in dates
  assert.equal(byRow(5).action, "create");
  assert.ok(byRow(5).warnings.some((w) => w.includes("No due date")));
  assert.ok(byRow(6).errors.some((e) => e.includes("C999")));
  assert.ok(byRow(7).errors.some((e) => e.includes("not a recognised date")));
  assert.ok(byRow(8).errors.some((e) => e.includes("not a valid amount")));
  assert.ok(byRow(9).errors.some((e) => e.includes("USD")));
  assert.ok(byRow(10).errors.some((e) => e.includes("Duplicate of row 2")));
  assert.ok(byRow(11).warnings.some((w) => w.includes("not a team member")));
  assert.equal(summary.reject, 5);
  assert.equal(summary.create, 5);
  assert.equal(summary.amount, 145000 + 210500 + 88000 + 56000 + 64250.5);
  console.log("import self-check: all assertions passed", summary);
}

main().finally(() => db.$disconnect());
