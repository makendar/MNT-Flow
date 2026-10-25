export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Returns a getter for single-valued search params (empty strings → undefined). */
export async function readParams(sp: SearchParams) {
  const p = await sp;
  return (k: string): string | undefined => {
    const v = p[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() !== "" ? s.trim() : undefined;
  };
}

export function qs(params: Record<string, string | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `?${s}` : "";
}
