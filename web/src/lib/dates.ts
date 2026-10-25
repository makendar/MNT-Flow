// Date convention: business dates (invoice, due, promise, delivery) are date-only values stored as
// UTC midnight. The reporting date ("as of") is a YYYY-MM-DD string in the organization's timezone.
// Overdue days = whole calendar days between due date and reporting date; never negative.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function todayISO(timeZone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function isoOf(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function dateFromISO(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addDays(iso: string, days: number): string {
  const d = dateFromISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return isoOf(d)!;
}

/** b - a in whole days (ISO date strings or Dates). */
export function daysBetween(a: string | Date, b: string | Date): number {
  const ai = typeof a === "string" ? a : isoOf(a)!;
  const bi = typeof b === "string" ? b : isoOf(b)!;
  return Math.round((dateFromISO(bi).getTime() - dateFromISO(ai).getTime()) / 86_400_000);
}

export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return isoOf(dateFromISO(iso)) === iso;
}

/** DD MMM YYYY */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const iso = typeof d === "string" ? d.slice(0, 10) : isoOf(d)!;
  const [y, m, day] = iso.split("-");
  return `${day} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function fmtDateTime(d: Date | null | undefined, timeZone = "Asia/Kolkata"): string {
  if (!d) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const local = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return `${fmtDate(local)}, ${parts}`;
}

/**
 * Parses common Indian/business date formats into YYYY-MM-DD. Returns null if unparseable.
 * Supported: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD-MMM-YYYY, DD MMM YYYY, Excel serial numbers.
 * Ambiguous NN/NN/YYYY is always read as day-first (Indian convention).
 */
export function parseFlexibleDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return build(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return build(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s,]*(\d{4})$/);
  if (m) {
    const mi = MONTHS.findIndex((x) => x.toLowerCase() === m![2].slice(0, 3).toLowerCase());
    if (mi >= 0) return build(+m[3], mi + 1, +m[1]);
  }
  if (/^\d{5}$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) return isoOf(new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000));
  }
  return null;
}

function build(y: number, mo: number, d: number): string | null {
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isValidISO(iso) ? iso : null;
}
