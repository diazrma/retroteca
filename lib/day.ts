// Tudo no site é derivado da data: o mesmo dia sempre gera a mesma "fita".
// Isso faz o site se renovar sozinho sem precisar de banco para o conteúdo.

export const TZ = "America/Sao_Paulo";
export const LAUNCH = "2026-09-27";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function isValidDay(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const t = Date.parse(d + "T00:00:00Z");
  return !Number.isNaN(t) && d >= LAUNCH && d <= today();
}

export function dayNumber(d: string): number {
  return Math.round(Date.parse(d + "T00:00:00Z") / 86400000);
}

/** Número da fita: 1 no dia de lançamento. */
export function tapeNumber(d: string): number {
  return dayNumber(d) - dayNumber(LAUNCH) + 1;
}

export function addDays(d: string, n: number): string {
  return new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
}

export function formatDay(d: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(new Date(d + "T12:00:00Z"))
    .replace(/^./, (c) => c.toUpperCase());
}

export function shortDay(d: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" })
    .format(new Date(d + "T12:00:00Z"))
    .replace(".", "");
}

export function listDays(): string[] {
  const out: string[] = [];
  for (let d = today(); d >= LAUNCH; d = addDays(d, -1)) out.push(d);
  return out;
}

// ---- aleatoriedade determinística ----

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
