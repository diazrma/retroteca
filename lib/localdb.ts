// Banco local em arquivo (.data/local-db.json): só para testar sem Redis no próprio computador.
// Na Vercel nunca é usado (lá o disco não é permanente; use o Upstash Redis).
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".data", "local-db.json");
export const useLocalFile = !process.env.VERCEL;

const replacer = (_: string, v: unknown) =>
  v instanceof Map ? { __map: [...v.entries()] } : v instanceof Set ? { __set: [...v] } : v;
const reviver = (_: string, v: any) => (v?.__map ? new Map(v.__map) : v?.__set ? new Set(v.__set) : v);

function readAll(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"), reviver);
  } catch {
    return {};
  }
}

export function loadLocal<T>(name: string, fallback: T): T {
  if (!useLocalFile) return fallback;
  const v = readAll()[name] as T | undefined;
  return v ? { ...fallback, ...v } : fallback;
}

const timers: Record<string, NodeJS.Timeout> = {};
export function saveLocal(name: string, value: unknown) {
  if (!useLocalFile) return;
  clearTimeout(timers[name]);
  timers[name] = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      const all = readAll();
      all[name] = value;
      fs.writeFileSync(FILE, JSON.stringify(all, replacer));
    } catch (e) {
      console.warn("[retroteca] não deu para salvar o banco local:", (e as Error).message);
    }
  }, 300);
}
