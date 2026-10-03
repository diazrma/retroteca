import { CATEGORY_BY_SLUG } from "./catalog";
import { isValidDay } from "./day";
import { findPin, SEARCH_PREFIX } from "./sources";
import type { PinMeta } from "./store";

// só aceitamos fotos destes servidores (as mesmas fontes que o site usa)
const ALLOWED_HOSTS = /^(api\.openverse\.org|upload\.wikimedia\.org|live\.staticflickr\.com|farm\d+\.staticflickr\.com|[a-z0-9.-]*\.wikimedia\.org)$/;

function fromClient(date: string, id: string, meta: any): PinMeta | null {
  if (!meta || typeof meta !== "object") return null;
  if (!/^(ov-[0-9a-f-]{36}|wm-\d{1,12})$/.test(id)) return null;
  try {
    const u = new URL(String(meta.src));
    if (u.protocol !== "https:" || !ALLOWED_HOSTS.test(u.hostname)) return null;
  } catch {
    return null;
  }
  const cat = String(meta.cat ?? "");
  return {
    id,
    src: String(meta.src),
    title: String(meta.title ?? "").slice(0, 120) || "Imagem retrô",
    date,
    cat: CATEGORY_BY_SLUG[cat] || cat === "busca" ? cat : "busca",
  };
}

/**
 * Confere a imagem no servidor (na fita do dia ou na busca). Se a fonte estiver fora do ar
 * naquele momento, aceita os dados enviados pelo navegador, desde que a foto venha das fontes oficiais.
 */
export async function resolvePin(date: unknown, id: unknown, meta?: unknown): Promise<PinMeta | null> {
  if (typeof date !== "string" || typeof id !== "string") return null;
  if (!date.startsWith(SEARCH_PREFIX) && !isValidDay(date)) return null;
  const p = await findPin(date, id).catch(() => null);
  if (p) return { id: p.id, src: p.src, title: p.title, date, cat: p.cat };
  return fromClient(date, id, meta);
}
