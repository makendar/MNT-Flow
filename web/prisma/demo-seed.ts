import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Synthetic demo dataset. All companies, people, identifiers and amounts are fictional.
// Dates are relative to the seeding day so the scenarios (e.g. "45 days overdue") hold on reset.

export const DEMO_ORG_ID = "org_demo";
export const DEMO_PASSWORD = "Demo@1234";

const MODELS = [
  "activityEvent", "actionItem", "document", "task", "issue", "collectionActivity", "paymentPromise", "creditAdjustment",
  "payment", "invoice", "dispatch", "salesOrder", "quotation", "importBatch",
] as const;

function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function seedDemo(db: PrismaClient) {
  const today = todayIST();
  const base = new Date(`${today}T00:00:00.000Z`).getTime();
  const d = (off: number) => new Date(base + off * 86_400_000);
  const at = (off: number, hh = 11, mm = 0) => new Date(base + off * 86_400_000 + (hh * 60 + mm - 330) * 60_000);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;

  // ---- wipe existing demo org data ----
  for (const m of MODELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)[m].deleteMany({ where: { orgId: DEMO_ORG_ID } });
  }
  await db.organization.deleteMany({ where: { id: DEMO_ORG_ID } });

  const org = await db.organization.create({
    data: {
      id: DEMO_ORG_ID,
      name: "Demo Precision Components Pvt. Ltd.",
      isDemo: true,
      address: "Plot 14, SIDCO Industrial Estate, Kurichi, Coimbatore 641021, Tamil Nadu (demo address)",
      timezone: "Asia/Kolkata",
      currency: "INR",
      fiscalYearStartMonth: 4,
      defaultPaymentTermsDays: 30,
      settingsJson: "{}",
    },
  });
  const orgId = org.id;
  await db.businessUnit.createMany({
    data: [
      { id: "bu_cbe", orgId, name: "Coimbatore Plant" },
      { id: "bu_hosur", orgId, name: "Hosur Unit" },
    ],
  });

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const staff: [string, string, string, string, string | null][] = [
    ["usr_admin", "Arun Prakash", "admin@demo-precision.example", "org_admin", null],
    ["usr_exec", "Lakshmi Narayanan", "owner@demo-precision.example", "executive", null],
    ["usr_finmgr", "Priya Raghavan", "finance.manager@demo-precision.example", "finance_manager", "finance"],
    ["usr_finexec", "Karthik Subramanian", "finance@demo-precision.example", "finance_exec", "finance"],
    ["usr_salesmgr", "Meena Sundaram", "sales.manager@demo-precision.example", "sales_manager", "sales"],
    ["usr_sales", "Vignesh Kumar", "sales@demo-precision.example", "sales_exec", "sales"],
    ["usr_ops", "Ramesh Babu", "dispatch@demo-precision.example", "operations", "dispatch"],
    ["usr_quality", "Divya Krishnan", "quality@demo-precision.example", "quality", "quality"],
    ["usr_audit", "Suresh Iyer", "auditor@demo-precision.example", "auditor", null],
  ];
  await db.user.createMany({ data: staff.map(([id, name, email, role, team]) => ({ id, orgId, name, email, role, team, passwordHash: hash })) });

  // ---- customers ----
  type C = [code: string, name: string, segment: string, city: string, state: string, terms: number, owner: string, bu: string, contact: string, tags: string];
  const custs: C[] = [
    ["C001", "Kovai Pumps & Motors Pvt. Ltd.", "Pumps & motors", "Coimbatore", "Tamil Nadu", 30, "usr_sales", "bu_cbe", "S. Balaji", "key-account,pumps"],
    ["C002", "Nilgiri Textile Machinery Ltd.", "Textile machinery", "Tiruppur", "Tamil Nadu", 30, "usr_salesmgr", "bu_cbe", "R. Kavitha", "textiles"],
    ["C003", "Cauvery Auto Components Pvt. Ltd.", "Automotive components", "Hosur", "Tamil Nadu", 30, "usr_sales", "bu_hosur", "R. Senthil", "automotive,watchlist"],
    ["C004", "Deccan Industrial Valves Pvt. Ltd.", "Valves & flow control", "Bengaluru", "Karnataka", 30, "usr_salesmgr", "bu_hosur", "Naveen Gowda", "key-account"],
    ["C005", "Marudhamalai Foundry Works", "Foundry & castings", "Coimbatore", "Tamil Nadu", 30, "usr_sales", "bu_cbe", "M. Selvaraj", "foundry"],
    ["C006", "Chennai Precision Fabricators Pvt. Ltd.", "Fabrication", "Chennai", "Tamil Nadu", 30, "usr_salesmgr", "bu_cbe", "Farhan Ali", "fabrication"],
    ["C007", "Mysuru Electricals & Controls", "Electrical equipment", "Mysuru", "Karnataka", 45, "usr_sales", "bu_hosur", "Shwetha Rao", "electrical"],
    ["C008", "Bhavani Polypack Industries", "Packaging & plastics", "Erode", "Tamil Nadu", 30, "usr_sales", "bu_cbe", "K. Gopal", "packaging"],
    ["C009", "Tumakuru Agro Equipment Pvt. Ltd.", "Agricultural machinery", "Tumakuru", "Karnataka", 30, "usr_salesmgr", "bu_hosur", "Prakash Hegde", "agri"],
    ["C010", "Salem Steel Castings", "Steel castings", "Salem", "Tamil Nadu", 30, "usr_sales", "bu_cbe", "V. Manickam", "on-hold"],
  ];
  const cid: Record<string, string> = {};
  for (const [code, name, segment, city, state, terms, owner, bu, contact, tags] of custs) {
    const slug = name.split(" ")[0].toLowerCase();
    const c = await db.customer.create({
      data: {
        orgId, code, name, segment, city, state, paymentTermsDays: terms, ownerId: owner, businessUnitId: bu, tags: `demo,${tags}`, isDemo: true,
        gstin: code === "C001" ? "DEMO-GSTIN-33-0001" : code === "C004" ? "DEMO-GSTIN-29-0004" : null,
        status: code === "C010" ? "on_hold" : "active",
        billingAddress: `Demo address, ${city}, ${state}`,
        shippingAddress: `Demo works, ${city}, ${state}`,
        primaryContactName: contact, primaryContactEmail: `purchase@${slug}.example`, primaryContactPhone: "+91 90000 0" + code.slice(1) + "1",
        procurementContactName: `${contact} (Procurement)`, procurementContactEmail: `procurement@${slug}.example`, procurementContactPhone: "+91 90000 0" + code.slice(1) + "2",
        accountsContactName: `Accounts team, ${name.split(" ")[0]}`, accountsContactEmail: `accounts@${slug}.example`, accountsContactPhone: "+91 90000 0" + code.slice(1) + "3",
        notes: code === "C003" ? "Customer reported working-capital pressure this quarter (internal note)." : code === "C010" ? "Account on hold pending contract review." : "",
        createdAt: at(-400 + Number(code.slice(1)) * 7),
      },
    });
    cid[code] = c.id;
  }

  await db.user.createMany({
    data: [
      { id: "usr_portal_kovai", orgId, name: "S. Balaji (Kovai Pumps)", email: "portal@kovai-pumps.example", role: "customer_portal", customerId: cid.C001, passwordHash: hash },
      { id: "usr_portal_deccan", orgId, name: "Naveen Gowda (Deccan Valves)", email: "portal@deccan-valves.example", role: "customer_portal", customerId: cid.C004, passwordHash: hash },
    ],
  });

  // ---- quotations ----
  type Q = [key: string, cust: string, qOff: number, validOff: number | null, amount: number, status: string, owner: string, lastOff: number | null, nextOff: number | null, extra?: { lostReason?: string; feedback?: string }];
  const quotes: Q[] = [
    ["QT1", "C007", -18, 12, 650000, "awaiting_response", "usr_sales", -10, -3, { feedback: "Buyer comparing with two other vendors; technical approval done." }],
    ["QT2", "C001", -40, -10, 410000, "accepted", "usr_sales", -28, null, { feedback: "Accepted after 3% volume discount." }],
    ["QT3", "C004", -6, 24, 275000, "sent", "usr_salesmgr", -6, 1],
    ["QT4", "C009", -35, -5, 188000, "rejected", "usr_salesmgr", -20, null, { lostReason: "Price: competitor quoted about 8% lower." }],
    ["QT5", "C003", -60, -30, 132000, "expired", "usr_sales", -45, null],
    ["QT6", "C002", -1, 29, 96000, "draft", "usr_salesmgr", null, null],
    ["QT7", "C007", -30, 0, 520000, "accepted", "usr_sales", -22, null],
    ["QT8", "C006", -9, 21, 342000, "negotiation", "usr_salesmgr", -4, 6, { feedback: "Asked for revised delivery schedule in two lots." }],
    ["QT9", "C005", -12, 18, 98000, "awaiting_response", "usr_sales", -7, 0],
    ["QT10", "C008", -14, 16, 145000, "sent", "usr_sales", -14, -1],
  ];
  const qid: Record<string, string> = {};
  let qn = 101;
  for (const [key, cust, qOff, vOff, amount, status, owner, lOff, nOff, extra] of quotes) {
    const q = await db.quotation.create({
      data: {
        orgId, number: `QT/${fy}/0${qn++}`, customerId: cid[cust], quoteDate: d(qOff), validUntil: vOff === null ? null : d(vOff), amount, status, ownerId: owner,
        lastContactDate: lOff === null ? null : d(lOff), nextFollowUpDate: nOff === null ? null : d(nOff), lostReason: extra?.lostReason ?? null, feedback: extra?.feedback ?? "",
        businessUnitId: custs.find((c) => c[0] === cust)![7], createdAt: at(qOff),
      },
    });
    qid[key] = q.id;
  }

  // ---- sales orders ----
  type O = [key: string, cust: string, po: string, oOff: number, value: number, expOff: number | null, status: string, owner: string, quote?: string, delay?: string];
  const orders: O[] = [
    ["SO1", "C001", "KPM/PO/2026/0418", -85, 180000, -78, "delivered", "usr_ops"],
    ["SO2", "C001", "KPM/PO/2026/0455", -27, 410000, 12, "in_progress", "usr_ops", "QT2"],
    ["SO3", "C005", "MFW/PO/1187", -20, 285000, 2, "in_progress", "usr_ops"],
    ["SO4", "C009", "TAE/PO/0342", -30, 230000, -3, "ready_for_dispatch", "usr_ops", undefined, "Paint shop backlog; awaiting final coat inspection"],
    ["SO5", "C004", "DIV/PO/7781", -48, 420000, -42, "delivered", "usr_ops"],
    ["SO6", "C006", "CPF/PO/0093", -3, 342000, 25, "confirmation_pending", "usr_salesmgr"],
    ["SO7", "C007", "MEC/PO/2210", -21, 520000, 20, "confirmed", "usr_sales", "QT7"],
    ["SO8", "C002", "NTM/PO/5530", -60, 240000, -52, "completed", "usr_ops"],
    ["SO9", "C006", "CPF/PO/0077", -42, 156000, -36, "delivered", "usr_ops"],
    ["SO10", "C003", "CAC/PO/8812", -78, 315000, -71, "delivered", "usr_ops"],
    ["SO11", "C008", "BPI/PO/0419", -16, 120000, 8, "on_hold", "usr_sales", undefined, "Customer revising drawing revision C"],
  ];
  const oid: Record<string, string> = {};
  let on = 301;
  for (const [key, cust, po, oOff, value, expOff, status, owner, quote, delay] of orders) {
    const o = await db.salesOrder.create({
      data: {
        orgId, number: `SO/${fy}/0${on++}`, customerId: cid[cust], customerPoNumber: po, orderDate: d(oOff), value, expectedDeliveryDate: expOff === null ? null : d(expOff),
        status, ownerId: owner, quotationId: quote ? qid[quote] : null, delayReason: delay ?? null, businessUnitId: custs.find((c) => c[0] === cust)![7], createdAt: at(oOff),
      },
    });
    oid[key] = o.id;
  }

  // ---- dispatches ----
  type D = [order: string, cust: string, commitOff: number, dispOff: number | null, delOff: number | null, status: string, pod: boolean, transporter: string];
  const dispatches: D[] = [
    ["SO1", "C001", -78, -78, -77, "delivered", false, "KPN Logistics (demo)"],
    ["SO5", "C004", -42, -43, -41, "delivered", true, "Deccan Roadways (demo)"],
    ["SO9", "C006", -36, -37, -35, "delivered", true, "Chennai Cargo Movers (demo)"],
    ["SO10", "C003", -71, -72, -70, "delivered", true, "Hosur Freight (demo)"],
    ["SO8", "C002", -52, -53, -51, "delivered", true, "KPN Logistics (demo)"],
    ["SO3", "C005", 2, null, null, "planned", false, ""],
    ["SO4", "C009", -3, null, null, "planned", false, ""],
  ];
  let dn = 501;
  for (const [order, cust, cOff, dOff, delOff, status, pod, transporter] of dispatches) {
    await db.dispatch.create({
      data: {
        orgId, orderId: oid[order], customerId: cid[cust], challanNumber: `DC/${fy}/0${dn++}`, committedDate: d(cOff), dispatchDate: dOff === null ? null : d(dOff),
        deliveredDate: delOff === null ? null : d(delOff), status, podReceived: pod, transporter, ownerId: "usr_ops",
      },
    });
  }

  // ---- invoices + payments ----
  type I = [key: string, cust: string, invOff: number, dueOff: number | null, total: number, pays: [number, number][], owner: string, order?: string, opts?: { onHold?: string; nextFu?: number; lastFu?: number }];
  const invs: I[] = [
    ["A", "C001", -75, -45, 180000, [], "usr_finexec", "SO1", { lastFu: -6, nextFu: -1 }],
    ["B", "C001", -60, -30, 125000, [[-32, 125000]], "usr_finexec"],
    ["C", "C001", -20, 10, 212400, [], "usr_finexec"],
    ["D", "C001", -8, 22, 98500, [], "usr_finexec"],
    ["E", "C002", -50, -20, 240000, [[-10, 100000]], "usr_finexec", "SO8", { lastFu: -8, nextFu: 5 }],
    ["F", "C002", -80, -50, 86000, [[-15, 86000]], "usr_finexec"],
    ["G", "C002", -12, 18, 175000, [], "usr_finexec"],
    ["AA", "C002", -28, 2, 64000, [], "usr_finexec"],
    ["H", "C003", -70, -40, 315000, [], "usr_finmgr", "SO10", { lastFu: -3, nextFu: 0 }],
    ["I", "C003", -95, -65, 98000, [], "usr_finmgr"],
    ["J", "C003", -15, 15, 142000, [], "usr_finmgr"],
    ["K", "C004", -40, -10, 420000, [], "usr_finmgr", "SO5", { nextFu: 3 }],
    ["L", "C004", -65, -35, 188000, [[-5, 90000]], "usr_finmgr"],
    ["M", "C004", -5, 25, 265000, [], "usr_finmgr"],
    ["N", "C005", -130, -100, 74500, [], "usr_finexec"],
    ["O", "C005", -45, -15, 132000, [[-3, 132000]], "usr_finexec"],
    ["P", "C005", -25, 5, 96000, [], "usr_finexec"],
    ["Q", "C006", -35, -5, 156000, [], "usr_finexec", "SO9"],
    ["R", "C006", -55, -25, 118000, [[-20, 50000]], "usr_finexec"],
    ["Z", "C006", -3, 27, 99000, [], "usr_finexec"],
    ["S", "C007", -48, -3, 205000, [], "usr_finexec"],
    ["T", "C007", -10, 35, 88000, [], "usr_finexec"],
    ["AB", "C007", -90, -45, 76000, [[-40, 76000]], "usr_finexec"],
    ["U", "C008", -40, -10, 64000, [], "usr_finexec"],
    ["V", "C008", -70, -40, 52000, [[-38, 52000]], "usr_finexec"],
    ["W", "C009", -62, -32, 145000, [], "usr_finmgr"],
    ["X", "C009", -18, 12, 230000, [], "usr_finmgr"],
    ["Y", "C010", -100, -70, 310000, [], "usr_finmgr", undefined, { onHold: "Contract terms under review with customer; collection paused by Finance Manager." }],
  ];
  const iid: Record<string, string> = {};
  const inum: Record<string, string> = {};
  let invNo = 401;
  const sorted = [...invs].sort((a, b) => a[2] - b[2]);
  for (const [key, cust, invOff, dueOff, total, pays, owner, order, o] of sorted) {
    const number = `DPC/${fy}/0${invNo++}`;
    const inv = await db.invoice.create({
      data: {
        orgId, number, customerId: cid[cust], orderId: order ? oid[order] : null, invoiceDate: d(invOff), dueDate: dueOff === null ? null : d(dueOff), total, ownerId: owner,
        onHold: !!o?.onHold, holdReason: o?.onHold ?? null, lastFollowUpDate: o?.lastFu !== undefined ? d(o.lastFu) : null, nextFollowUpDate: o?.nextFu !== undefined ? d(o.nextFu) : null,
        businessUnitId: custs.find((c) => c[0] === cust)![7], createdAt: at(invOff, 18),
      },
    });
    iid[key] = inv.id;
    inum[key] = number;
    let ref = 1;
    for (const [pOff, amount] of pays) {
      await db.payment.create({ data: { orgId, customerId: cid[cust], invoiceId: inv.id, amount, paymentDate: d(pOff), reference: `NEFT/DEMO/${cust}/${key}${ref++}`, mode: "bank_transfer", createdById: "usr_finexec" } });
    }
    await db.activityEvent.create({
      data: { orgId, entityType: "invoice", entityId: inv.id, customerId: cid[cust], kind: "import", source: "import", message: `Invoice ${number} imported from accounting export (synthetic demo data).`, createdAt: at(invOff, 19) },
    });
  }
  // Unapplied payment (exception) and a credit note
  await db.payment.create({ data: { orgId, customerId: cid.C005, invoiceId: null, amount: 25000, paymentDate: d(-6), reference: "NEFT/DEMO/C005/UNAPPLIED", mode: "bank_transfer", createdById: "usr_finexec" } });
  await db.creditAdjustment.create({ data: { orgId, invoiceId: iid.L, amount: 8000, type: "credit_note", reference: `CN/${fy}/0012`, date: d(-12), reason: "Rate difference on 40 flanges (agreed with customer)", createdById: "usr_finmgr" } });

  // ---- payment promises ----
  type P = [inv: string, cust: string, amount: number, promOff: number, recOff: number, contact: string, owner: string, notes: string];
  const proms: P[] = [
    ["H", "C003", 315000, -5, -12, "R. Senthil (Accounts)", "usr_finmgr", "Promised full payment after their customer receipt."],
    ["I", "C003", 98000, -20, -30, "R. Senthil (Accounts)", "usr_finmgr", "Promised by month end."],
    ["U", "C008", 64000, 0, -4, "K. Gopal", "usr_finexec", "Cheque to be deposited today."],
    ["E", "C002", 140000, 5, -8, "R. Kavitha", "usr_finexec", "Balance after quality sign-off of last lot."],
    ["F", "C002", 86000, -14, -25, "R. Kavitha", "usr_finexec", "After GRN shared."],
    ["L", "C004", 180000, -4, -12, "Naveen Gowda", "usr_finmgr", "Part payment promised, balance after credit note."],
  ];
  for (const [inv, cust, amount, pOff, rOff, contact, owner, notes] of proms) {
    await db.paymentPromise.create({ data: { orgId, invoiceId: iid[inv], customerId: cid[cust], amount, promisedDate: d(pOff), recordedAt: d(rOff), contactName: contact, ownerId: owner, createdById: owner, notes } });
  }

  // ---- collection activities ----
  type A = [cust: string, inv: string, off: number, channel: string, summary: string, response: string, next: string, nextOff: number | null, user: string];
  const acts: A[] = [
    ["C001", "A", -6, "call", "Called accounts about overdue invoice.", "Accounts say payment is held until signed POD is received.", "Get POD from dispatch team.", -1, "usr_finexec"],
    ["C003", "H", -12, "call", "Follow-up on overdue invoices.", "Promised full payment within a week.", "Check receipt on promised date.", -5, "usr_finmgr"],
    ["C003", "H", -3, "meeting", "Met MD at Hosur plant regarding missed promise.", "Cash-flow pressure; requested a two-part payment plan.", "Agree written payment schedule.", 0, "usr_finmgr"],
    ["C002", "E", -8, "email", "Shared statement of account and balance due.", "Balance to be released after quality sign-off.", "Confirm sign-off with quality.", 5, "usr_finexec"],
    ["C004", "K", -7, "call", "Called regarding payment of invoice.", "Payment blocked due to quality rejection of 12 housings.", "Quality to review rejection report.", 3, "usr_finmgr"],
    ["C009", "W", -9, "email", "Payment reminder sent (manually, from Outlook).", "No response yet.", "Call accounts head.", -2, "usr_finmgr"],
    ["C008", "U", -4, "call", "Reminder call.", "Cheque will be deposited on promised date.", "Verify bank credit.", 0, "usr_finexec"],
  ];
  for (const [cust, inv, off, channel, summary, response, next, nOff, user] of acts) {
    await db.collectionActivity.create({ data: { orgId, customerId: cid[cust], invoiceId: iid[inv], occurredAt: at(off, 15, 30), channel, summary, customerResponse: response, nextStep: next, nextFollowUpDate: nOff === null ? null : d(nOff), userId: user, createdAt: at(off, 15, 35) } });
    await db.activityEvent.create({ data: { orgId, entityType: "invoice", entityId: iid[inv], customerId: cid[cust], kind: "collection", source: "user", userId: user, message: `${channel[0].toUpperCase() + channel.slice(1)}: ${summary} Response: ${response}`, createdAt: at(off, 15, 35) } });
  }

  // ---- issues ----
  type IS = {
    key: string; cust: string; inv?: string; order?: string; category: string; title: string; description: string; reportedBy: string; source?: string;
    owner: string; team: string; priority: string; createdOff: number; dueOff: number | null; status: string; blocks: boolean;
    missing?: string; next?: string; rootCause?: string; resolution?: string; resolvedOff?: number; confirmed?: boolean;
  };
  const issues: IS[] = [
    { key: "I1", cust: "C001", inv: "A", order: "SO1", category: "missing_pod", title: "Signed proof of delivery not available for invoice", description: "Customer accounts will not release payment without a signed POD for the delivery against PO KPM/PO/2026/0418.", reportedBy: "S. Balaji (Kovai Pumps accounts)", owner: "usr_ops", team: "dispatch", priority: "high", createdOff: -20, dueOff: -2, status: "waiting_document", blocks: true, missing: "Signed POD / acknowledged delivery challan", next: "Get the signed POD from KPN Logistics and share it with Kovai Pumps accounts." },
    { key: "I2", cust: "C004", inv: "K", order: "SO5", category: "quality_complaint", title: "12 impeller housings rejected for porosity", description: "Customer incoming inspection rejected 12 of 400 housings for casting porosity. Payment for the full invoice is on hold pending resolution.", reportedBy: "Naveen Gowda (Deccan Valves QA)", owner: "usr_quality", team: "quality", priority: "high", createdOff: -8, dueOff: 3, status: "investigating", blocks: true, missing: "Customer rejection report with photographs", next: "Review the customer's inspection report and propose replacement or credit note for rejected units." },
    { key: "I3", cust: "C006", inv: "Q", order: "SO9", category: "tax_mismatch", title: "PO number on invoice does not match customer PO", description: "Invoice quotes PO CPF/PO/0071 but the customer's PO is CPF/PO/0077. Customer AP cannot match the invoice.", reportedBy: "Farhan Ali (Chennai Precision AP)", owner: "usr_finexec", team: "finance", priority: "medium", createdOff: -6, dueOff: 0, status: "waiting_internal", blocks: true, missing: "Corrected invoice referencing PO CPF/PO/0077", next: "Issue a corrected invoice with the right PO reference and share with customer AP." },
    { key: "I4", cust: "C001", inv: "C", category: "pricing_mismatch", title: "Clarification on freight charges in invoice", description: "Customer asked why freight is charged separately when the PO mentions door delivery.", reportedBy: "S. Balaji (via customer portal)", source: "portal", owner: "usr_finexec", team: "finance", priority: "medium", createdOff: -2, dueOff: 2, status: "open", blocks: false, next: "Check the PO Incoterms with sales and reply to the customer." },
    { key: "I5", cust: "C002", inv: "F", order: "SO8", category: "missing_grn", title: "GRN reference required for payment release", description: "Customer accounts required the GRN reference before processing payment.", reportedBy: "R. Kavitha (Nilgiri accounts)", owner: "usr_finexec", team: "finance", priority: "medium", createdOff: -26, dueOff: -18, status: "resolved", blocks: true, rootCause: "GRN was posted late by the customer's stores team.", resolution: "Customer stores shared GRN 5530-GRN-118; invoice released and paid.", resolvedOff: -17, confirmed: true },
    { key: "I6", cust: "C003", inv: "H", category: "cashflow_delay", title: "Customer requests payment plan due to cash-flow pressure", description: "Customer MD indicated a delay in receipts from their OEM customer and requested to split payment.", reportedBy: "R. Senthil (Cauvery Auto accounts)", owner: "usr_finmgr", team: "finance", priority: "high", createdOff: -35, dueOff: 1, status: "waiting_customer", blocks: false, next: "Agree a written two-part payment schedule and record it as payment promises." },
    { key: "I7", cust: "C005", order: "SO3", category: "delivery_issue", title: "Customer requests partial dispatch of 200 units", description: "Customer wants 200 of 500 units earlier than committed due to their own line schedule.", reportedBy: "M. Selvaraj (Marudhamalai Foundry)", owner: "usr_ops", team: "operations", priority: "medium", createdOff: -1, dueOff: 2, status: "open", blocks: false, next: "Check machining capacity and confirm whether a partial dispatch is feasible." },
  ];
  const isid: Record<string, string> = {};
  let isn = 1001;
  for (const is of issues) {
    const row = await db.issue.create({
      data: {
        orgId, number: `ISS-${isn++}`, customerId: cid[is.cust], invoiceId: is.inv ? iid[is.inv] : null, orderId: is.order ? oid[is.order] : null, category: is.category, title: is.title,
        description: is.description, reportedBy: is.reportedBy, source: is.source ?? "internal", ownerId: is.owner, team: is.team, priority: is.priority, dueDate: is.dueOff === null ? null : d(is.dueOff),
        status: is.status, blocksPayment: is.blocks, missingEvidence: is.missing ?? null, nextAction: is.next ?? null, rootCause: is.rootCause ?? null, resolutionNotes: is.resolution ?? null,
        resolvedAt: is.resolvedOff !== undefined ? at(is.resolvedOff, 16) : null, customerConfirmed: !!is.confirmed, unblockConfirmed: !!is.confirmed, createdAt: at(is.createdOff, 10),
      },
    });
    isid[is.key] = row.id;
    await db.activityEvent.create({ data: { orgId, entityType: "issue", entityId: row.id, customerId: cid[is.cust], kind: "created", source: is.source === "portal" ? "portal" : "user", visibility: "customer", userId: is.source === "portal" ? "usr_portal_kovai" : is.owner, message: `Issue raised: ${is.title}`, createdAt: at(is.createdOff, 10) } });
  }
  const comments: [string, string, number, string, string, "internal" | "customer"][] = [
    ["I1", "C001", -10, "usr_ops", "Transporter says the signed copy is with the driver; expected back this week.", "internal"],
    ["I1", "C001", -3, "usr_finexec", "Customer reconfirmed payment will be released on receipt of POD.", "internal"],
    ["I2", "C004", -7, "usr_quality", "Requested rejection report and photos from customer QA.", "customer"],
    ["I2", "C004", -2, "usr_quality", "Internal: porosity likely from batch H-221; checking foundry records.", "internal"],
    ["I3", "C006", -5, "usr_finexec", "Confirmed PO 0077 with customer; corrected invoice pending approval.", "internal"],
    ["I4", "C001", -1, "usr_finexec", "We are checking the freight terms against your PO and will respond shortly.", "customer"],
    ["I5", "C002", -17, "usr_finexec", "GRN received and verified; marking resolved. Customer confirmed payment release.", "customer"],
    ["I6", "C003", -3, "usr_finmgr", "MD proposed 50% now and 50% in 3 weeks. Awaiting written confirmation.", "internal"],
  ];
  for (const [is, cust, off, user, msg, vis] of comments) {
    await db.activityEvent.create({ data: { orgId, entityType: "issue", entityId: isid[is], customerId: cid[cust], kind: "comment", source: "user", visibility: vis, userId: user, message: msg, createdAt: at(off, 14) } });
  }
  await db.activityEvent.create({ data: { orgId, entityType: "issue", entityId: isid.I5, customerId: cid.C002, kind: "status_change", source: "user", visibility: "customer", userId: "usr_finexec", message: "Status changed to Resolved. Customer confirmed resolution; invoice unblocked.", createdAt: at(-17, 16) } });

  // ---- tasks ----
  type T = [title: string, desc: string, cust: string | null, inv: string | null, issue: string | null, owner: string, priority: string, dueOff: number, status: string];
  const tasks: T[] = [
    ["Share signed POD with Kovai Pumps accounts", "Collect from KPN Logistics and upload to ISS-1001.", "C001", "A", "I1", "usr_ops", "high", -2, "open"],
    ["Prepare credit note draft for rejected housings", "Pending quality decision on replacement vs credit.", "C004", "K", "I2", "usr_finexec", "medium", 4, "open"],
    ["Call Cauvery Auto MD regarding payment plan", "Confirm two-part schedule in writing.", "C003", "H", "I6", "usr_finmgr", "high", 0, "in_progress"],
    ["Send revised quotation to Mysuru Electricals", "Include revised lead time for 2nd lot.", "C007", null, null, "usr_sales", "medium", -1, "open"],
    ["Monthly receivables review with Finance Manager", "Review ageing and missed promises.", null, null, null, "usr_finmgr", "low", 6, "open"],
    ["Request GRN copy from Nilgiri stores", "Needed for payment release.", "C002", "F", "I5", "usr_finexec", "medium", -20, "done"],
  ];
  for (const [title, desc, cust, inv, issue, owner, priority, dueOff, status] of tasks) {
    await db.task.create({
      data: {
        orgId, title, description: desc, customerId: cust ? cid[cust] : null, invoiceId: inv ? iid[inv] : null, issueId: issue ? isid[issue] : null, ownerId: owner, priority, dueDate: d(dueOff), status,
        createdById: "usr_finmgr", completedById: status === "done" ? owner : null, completedAt: status === "done" ? at(-18, 12) : null, createdAt: at(Math.min(dueOff, 0) - 5),
      },
    });
  }

  // ---- synthetic documents (metadata only; download serves a placeholder) ----
  type DOC = [type: string, file: string, cust: string, opts: { inv?: string; order?: string; issue?: string; shared?: boolean; off: number; portal?: boolean }];
  const docs: DOC[] = [
    ["purchase_order", "KPM-PO-2026-0418.pdf", "C001", { order: "SO1", shared: true, off: -85 }],
    ["invoice", `${inum.A.replace(/\//g, "-")}.pdf`, "C001", { inv: "A", shared: true, off: -75 }],
    ["delivery_challan", "DC-unsigned-copy.pdf", "C001", { order: "SO1", issue: "I1", off: -78 }],
    ["inspection_report", "Deccan-incoming-inspection-rejection.pdf", "C004", { issue: "I2", inv: "K", shared: true, off: -7, portal: true }],
    ["proof_of_delivery", "DIV-POD-signed.pdf", "C004", { order: "SO5", shared: true, off: -41 }],
    ["grn", "NTM-GRN-5530-118.pdf", "C002", { issue: "I5", inv: "F", shared: true, off: -17 }],
    ["credit_note", `CN-${fy}-0012.pdf`, "C004", { inv: "L", shared: true, off: -12 }],
    ["correspondence", "Cauvery-MD-meeting-notes.txt", "C003", { issue: "I6", off: -3 }],
  ];
  for (const [type, file, cust, o] of docs) {
    await db.document.create({
      data: {
        orgId, customerId: cid[cust], invoiceId: o.inv ? iid[o.inv] : null, orderId: o.order ? oid[o.order] : null, issueId: o.issue ? isid[o.issue] : null, type, fileName: file,
        mimeType: file.endsWith(".txt") ? "text/plain" : "application/pdf", size: 48_000 + file.length * 512, storageKey: null, sharedWithCustomer: !!o.shared,
        uploadedById: o.portal ? null : "usr_finexec", uploadedByPortal: !!o.portal, isSynthetic: true, createdAt: at(o.off, 12),
      },
    });
    await db.activityEvent.create({ data: { orgId, entityType: o.issue ? "issue" : o.inv ? "invoice" : "order", entityId: o.issue ? isid[o.issue] : o.inv ? iid[o.inv] : oid[o.order!], customerId: cid[cust], kind: "document", source: o.portal ? "portal" : "user", visibility: o.shared ? "customer" : "internal", message: `Document attached: ${file} (synthetic demo file)`, createdAt: at(o.off, 12), userId: o.portal ? null : "usr_finexec" } });
  }

  await db.activityEvent.create({ data: { orgId, entityType: "organization", entityId: orgId, kind: "system", source: "system", message: "Demo dataset seeded (all records are synthetic).", createdAt: new Date() } });

  return { orgId, today };
}
