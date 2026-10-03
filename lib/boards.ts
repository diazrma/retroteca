// Murais: coleções de imagens criadas pelas pessoas, com link público para compartilhar.
import { Redis } from "@upstash/redis";
import { loadLocal, saveLocal } from "./localdb";
import type { PinMeta } from "./store";

export type Board = {
  id: string;
  owner: string; // e-mail (nunca vai para o navegador)
  ownerName: string;
  ownerImage?: string;
  title: string;
  desc: string;
  pins: PinMeta[];
  createdAt: number;
  updatedAt: number;
};
/** O que pode ser mostrado publicamente. */
export type PublicBoard = Omit<Board, "owner"> & { mine: boolean };

export const LIMITS = { boards: 50, pins: 300, title: 60, desc: 240 };

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const g = globalThis as unknown as { __boards?: { boards: Map<string, Board>; recent: string[] } };
const mem = (g.__boards ??= loadLocal("boards", { boards: new Map<string, Board>(), recent: [] as string[] }));
const persist = () => saveLocal("boards", mem);

const K = {
  board: (id: string) => `board:${id}`,
  mine: (user: string) => `boards:${user}`,
  recent: "boards:recent",
};

export function toPublic(b: Board, user?: string | null): PublicBoard {
  const { owner, ...rest } = b;
  return { ...rest, mine: Boolean(user && owner === user) };
}

const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

export async function getBoard(id: string): Promise<Board | null> {
  if (!/^[a-z0-9]{6,20}$/.test(id)) return null;
  if (!redis) return mem.boards.get(id) ?? null;
  return (await redis.get<Board>(K.board(id))) ?? null;
}

async function put(b: Board) {
  b.updatedAt = Date.now();
  if (!redis) return void (mem.boards.set(b.id, b), persist());
  await redis.set(K.board(b.id), b);
}

export async function listMine(user: string): Promise<Board[]> {
  if (!redis) return [...mem.boards.values()].filter((b) => b.owner === user).sort((a, b) => b.updatedAt - a.updatedAt);
  const ids = await redis.smembers(K.mine(user));
  if (!ids.length) return [];
  const all = await redis.mget<(Board | null)[]>(...ids.map(K.board));
  return all.filter((b): b is Board => Boolean(b)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listRecent(n = 24): Promise<Board[]> {
  let ids: string[];
  if (!redis) ids = mem.recent.slice(0, n);
  else ids = await redis.zrange<string[]>(K.recent, 0, n - 1, { rev: true });
  const all = await Promise.all(ids.map(getBoard));
  return all.filter((b): b is Board => Boolean(b && b.pins.length));
}

async function touchRecent(id: string) {
  if (!redis) {
    mem.recent = [id, ...mem.recent.filter((x) => x !== id)].slice(0, 200);
    persist();
    return;
  }
  await redis.zadd(K.recent, { score: Date.now(), member: id });
}

export async function createBoard(user: { email: string; name: string; image?: string }, title: string, desc: string) {
  const mine = await listMine(user.email);
  if (mine.length >= LIMITS.boards) throw new Error(`Limite de ${LIMITS.boards} murais.`);
  const b: Board = {
    id: newId(),
    owner: user.email,
    ownerName: user.name.slice(0, 40),
    ownerImage: user.image,
    title: title.slice(0, LIMITS.title) || "Meu mural retrô",
    desc: desc.slice(0, LIMITS.desc),
    pins: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await put(b);
  if (redis) await redis.sadd(K.mine(user.email), b.id);
  return b;
}

/** Carrega o mural garantindo que quem pede é o dono. */
async function owned(id: string, user: string): Promise<Board> {
  const b = await getBoard(id);
  if (!b) throw new Error("Mural não encontrado.");
  if (b.owner !== user) throw new Error("Só quem criou pode mudar este mural.");
  return b;
}

export async function addPin(id: string, user: string, meta: PinMeta) {
  const b = await owned(id, user);
  if (b.pins.some((p) => p.id === meta.id)) return b;
  if (b.pins.length >= LIMITS.pins) throw new Error(`Limite de ${LIMITS.pins} imagens por mural.`);
  b.pins.unshift(meta);
  await put(b);
  await touchRecent(b.id);
  return b;
}

export async function removePin(id: string, user: string, pinId: string) {
  const b = await owned(id, user);
  b.pins = b.pins.filter((p) => p.id !== pinId);
  await put(b);
  return b;
}

export async function updateBoard(id: string, user: string, patch: { title?: string; desc?: string; order?: string[] }) {
  const b = await owned(id, user);
  if (typeof patch.title === "string") b.title = patch.title.trim().slice(0, LIMITS.title) || b.title;
  if (typeof patch.desc === "string") b.desc = patch.desc.trim().slice(0, LIMITS.desc);
  if (Array.isArray(patch.order)) {
    const rank = new Map(patch.order.map((pid, i) => [pid, i]));
    b.pins = [...b.pins].sort((x, y) => (rank.get(x.id) ?? 1e9) - (rank.get(y.id) ?? 1e9));
  }
  await put(b);
  return b;
}

export async function deleteBoard(id: string, user: string) {
  await owned(id, user);
  if (!redis) {
    mem.boards.delete(id);
    mem.recent = mem.recent.filter((x) => x !== id);
    persist();
    return;
  }
  await Promise.all([redis.del(K.board(id)), redis.srem(K.mine(user), id), redis.zrem(K.recent, id)]);
}
