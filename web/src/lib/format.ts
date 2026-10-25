const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-IN");

/** ₹1,25,000 */
export function fmtINR(v: number | null | undefined, paise = false): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return (paise ? inrPaise : inr).format(v);
}

/** ₹12.4 L / ₹1.2 Cr for compact KPI display. */
export function fmtINRCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return fmtINR(v);
}

export function fmtNum(v: number): string {
  return num.format(v);
}

export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function humanize(s: string | null | undefined): string {
  if (!s) return "—";
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
