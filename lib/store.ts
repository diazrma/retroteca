// Persistência de curtidas, comentários e inscrições de push.
// Em produção usa Upstash Redis (integração gratuita da Vercel).
// Sem as variáveis de ambiente, cai para memória (bom para testar localmente).
import { Redis } from "@upstash/redis";
import fs from "node:fs";
import path from "node:path";
import { loadLocal, saveLocal, useLocalFile } from "./localdb";

export type PinMeta = { id: string; src: string; title: string; date: string; cat: string };
export type Comment = { id: string; name: string; avatar?: string; text: string; at: number };
export type Fav = PinMeta & { at: number };
export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string }; cats: string[] };

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export const hasDatabase = Boolean(redis);

// ---------- backend em memória ----------
const g = globalThis as unknown as { __retro?: MemoryDb };
type MemoryDb = {
  likes: Map<string, Set<string>>;
  comments: Map<string, Comment[]>;
  meta: Map<string, PinMeta>;
  subs: Map<string, PushSub>;
  favs: Map<string, Map<string, Fav>>;
};
const mem: MemoryDb = (g.__retro ??= loadLocal<MemoryDb>("store", {
  likes: new Map(),
  comments: new Map(),
  meta: new Map(),
  subs: new Map(),
  favs: new Map(),
}));
const persist = () => saveLocal("store", mem);
mem.favs ??= new Map();

const K = {
  likes: (id: string) => `likes:${id}`,
  comments: (id: string) => `comments:${id}`,
  meta: (id: string) => `meta:${id}`,
  rank: "rank:likes",
  subs: "push:subs",
  slow: (user: string) => `slow:${user}`,
  favs: (user: string) => `favs:${user}`,
  seen: "seen:pins",
  seenDays: "seen:days",
};

export type Stats = Record<string, { likes: number; comments: number; liked: boolean; saved: boolean }>;

export async function getStats(ids: string[], user?: string | null): Promise<Stats> {
  const out: Stats = {};
  if (!redis) {
    for (const id of ids) {
      const s = mem.likes.get(id);
      out[id] = {
        likes: s?.size ?? 0,
        comments: mem.comments.get(id)?.length ?? 0,
        liked: Boolean(user && s?.has(user)),
        saved: Boolean(user && mem.favs.get(user)?.has(id)),
      };
    }
    return out;
  }
  const p = redis.pipeline();
  for (const id of ids) {
    p.scard(K.likes(id));
    p.llen(K.comments(id));
    p.sismember(K.likes(id), user ?? "-");
    p.hexists(K.favs(user ?? "-"), id);
  }
  const res = (await p.exec()) as number[];
  ids.forEach((id, i) => {
    out[id] = {
      likes: res[i * 4] ?? 0,
      comments: res[i * 4 + 1] ?? 0,
      liked: res[i * 4 + 2] === 1,
      saved: res[i * 4 + 3] === 1,
    };
  });
  return out;
}

export async function toggleLike(meta: PinMeta, user: string) {
  if (!redis) {
    const s = mem.likes.get(meta.id) ?? new Set();
    const liked = !s.has(user);
    liked ? s.add(user) : s.delete(user);
    mem.likes.set(meta.id, s);
    mem.meta.set(meta.id, meta);
    persist();
    return { liked, likes: s.size };
  }
  const already = (await redis.sismember(K.likes(meta.id), user)) === 1;
  const p = redis.pipeline();
  if (already) p.srem(K.likes(meta.id), user);
  else p.sadd(K.likes(meta.id), user);
  p.scard(K.likes(meta.id));
  p.set(K.meta(meta.id), meta);
  const res = (await p.exec()) as number[];
  const likes = res[1];
  await redis.zadd(K.rank, { score: likes, member: meta.id });
  return { liked: !already, likes };
}

export async function getComments(id: string): Promise<Comment[]> {
  if (!redis) return mem.comments.get(id) ?? [];
  return (await redis.lrange<Comment>(K.comments(id), 0, 99)) ?? [];
}

/** Retorna false se a pessoa comentou há menos de 10s (anti-spam simples). */
export async function addComment(meta: PinMeta, c: Comment, user: string): Promise<boolean> {
  if (!redis) {
    const list = mem.comments.get(meta.id) ?? [];
    list.unshift(c);
    mem.comments.set(meta.id, list.slice(0, 200));
    mem.meta.set(meta.id, meta);
    persist();
    return true;
  }
  const ok = await redis.set(K.slow(user), 1, { nx: true, ex: 10 });
  if (!ok) return false;
  const p = redis.pipeline();
  p.lpush(K.comments(meta.id), c);
  p.ltrim(K.comments(meta.id), 0, 199);
  p.set(K.meta(meta.id), meta);
  await p.exec();
  return true;
}

export async function topPins(n = 40): Promise<(PinMeta & { likes: number })[]> {
  if (!redis) {
    return [...mem.likes.entries()]
      .map(([id, s]) => ({ ...(mem.meta.get(id) as PinMeta), likes: s.size }))
      .filter((p) => p.id && p.likes > 0)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, n);
  }
  const ranked = await redis.zrange<string[]>(K.rank, 0, n - 1, { rev: true, withScores: true });
  const pairs: { id: string; likes: number }[] = [];
  for (let i = 0; i < ranked.length; i += 2) pairs.push({ id: String(ranked[i]), likes: Number(ranked[i + 1]) });
  const live = pairs.filter((p) => p.likes > 0);
  if (!live.length) return [];
  const metas = await redis.mget<(PinMeta | null)[]>(...live.map((p) => K.meta(p.id)));
  return live.flatMap((p, i) => (metas[i] ? [{ ...metas[i]!, likes: p.likes }] : []));
}

// ---------- favoritos ----------
export async function toggleFav(meta: PinMeta, user: string): Promise<boolean> {
  if (!redis) {
    const m = mem.favs.get(user) ?? new Map<string, Fav>();
    mem.favs.set(user, m);
    const saved = !m.has(meta.id);
    if (saved) m.set(meta.id, { ...meta, at: Date.now() });
    else m.delete(meta.id);
    persist();
    return saved;
  }
  if (await redis.hexists(K.favs(user), meta.id)) {
    await redis.hdel(K.favs(user), meta.id);
    return false;
  }
  await redis.hset(K.favs(user), { [meta.id]: { ...meta, at: Date.now() } });
  return true;
}

export async function listFavs(user: string): Promise<Fav[]> {
  const all = redis ? Object.values((await redis.hgetall<Record<string, Fav>>(K.favs(user))) ?? {}) : [...(mem.favs.get(user)?.values() ?? [])];
  return all.sort((a, b) => b.at - a.at);
}

// ---------- push ----------
export async function saveSub(sub: PushSub) {
  if (!redis) return void (mem.subs.set(sub.endpoint, sub), persist());
  await redis.hset(K.subs, { [sub.endpoint]: sub });
}

export async function removeSub(endpoint: string) {
  if (!redis) return void (mem.subs.delete(endpoint), persist());
  await redis.hdel(K.subs, endpoint);
}

export async function allSubs(): Promise<PushSub[]> {
  if (!redis) return [...mem.subs.values()];
  const all = await redis.hgetall<Record<string, PushSub>>(K.subs);
  return Object.values(all ?? {});
}

// ---------- fitas sem repetição ----------
// Guarda o primeiro dia em que cada imagem (id ou endereço) apareceu numa fita.
// Sem Redis, usa um arquivo lido e gravado na hora (o build do Next roda em vários processos ao mesmo tempo).
type SeenFile = { pins: Record<string, string>; days: string[] };
const SEEN_FILE = path.join(process.cwd(), ".data", "seen.json");
function readSeen(): SeenFile {
  try {
    return JSON.parse(fs.readFileSync(SEEN_FILE, "utf8"));
  } catch {
    return { pins: {}, days: [] };
  }
}

/** Dias cuja fita já foi registrada. */
export async function seenDays(): Promise<Set<string>> {
  if (!redis) return new Set(readSeen().days);
  return new Set(await redis.smembers<string[]>(K.seenDays));
}

/** Primeiro dia em que cada chave apareceu (só as que já apareceram). */
export async function firstSeen(keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!keys.length) return out;
  if (!redis) {
    const { pins } = readSeen();
    for (const k of keys) if (pins[k]) out[k] = pins[k];
    return out;
  }
  for (let i = 0; i < keys.length; i += 500) {
    const part = keys.slice(i, i + 500);
    const vals = (await redis.hmget<Record<string, string>>(K.seen, ...part)) ?? {};
    for (const k of part) if (vals[k]) out[k] = vals[k];
  }
  return out;
}

/** Registra as imagens da fita de `date` (sem sobrescrever quem já apareceu antes). */
export async function markSeen(date: string, keys: string[]) {
  if (!redis) {
    if (!useLocalFile) return;
    const db = readSeen();
    for (const k of keys) if (!db.pins[k] || db.pins[k] > date) db.pins[k] = date;
    if (!db.days.includes(date)) db.days.push(date);
    fs.mkdirSync(path.dirname(SEEN_FILE), { recursive: true });
    const tmp = `${SEEN_FILE}.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, SEEN_FILE);
    return;
  }
  const pipe = redis.pipeline();
  for (const k of keys) pipe.hsetnx(K.seen, k, date);
  pipe.sadd(K.seenDays, date);
  await pipe.exec();
}

// ---------- arcade: ranking do dia ----------
export type ArcadeEntry = { name: string; score: number; me?: boolean };
type ArcadeDay = Map<string, { name: string; score: number }>;
const arcadeMem = ((globalThis as unknown as { __arcade?: Map<string, ArcadeDay> }).__arcade ??= new Map());
const AK = { rank: (d: string) => `arcade:rank:${d}`, names: (d: string) => `arcade:names:${d}`, slow: (p: string) => `arcade:slow:${p}` };

/** Guarda a melhor pontuação da pessoa no dia. Retorna false se mandou rápido demais. */
export async function saveArcadeScore(date: string, player: string, name: string, score: number): Promise<boolean> {
  if (!redis) {
    const day = arcadeMem.get(date) ?? new Map();
    const old = day.get(player);
    day.set(player, { name, score: Math.max(score, old?.score ?? 0) });
    arcadeMem.set(date, day);
    return true;
  }
  const ok = await redis.set(AK.slow(player), 1, { nx: true, ex: 3 });
  if (!ok) return false;
  const p = redis.pipeline();
  p.zadd(AK.rank(date), { gt: true }, { score, member: player });
  p.hset(AK.names(date), { [player]: name });
  p.expire(AK.rank(date), 60 * 60 * 24 * 60);
  p.expire(AK.names(date), 60 * 60 * 24 * 60);
  await p.exec();
  return true;
}

export async function arcadeTop(date: string, n = 10, player?: string | null): Promise<{ top: ArcadeEntry[]; mine: (ArcadeEntry & { pos: number }) | null; players: number }> {
  if (!redis) {
    const all = [...(arcadeMem.get(date)?.entries() ?? [])].sort((a, b) => b[1].score - a[1].score);
    const i = player ? all.findIndex(([id]) => id === player) : -1;
    return {
      top: all.slice(0, n).map(([id, e]) => ({ ...e, me: id === player })),
      mine: i >= 0 ? { ...all[i][1], me: true, pos: i + 1 } : null,
      players: all.length,
    };
  }
  const [raw, players] = await Promise.all([
    redis.zrange<string[]>(AK.rank(date), 0, n - 1, { rev: true, withScores: true }),
    redis.zcard(AK.rank(date)),
  ]);
  const ids: string[] = [];
  const scores: number[] = [];
  for (let i = 0; i < raw.length; i += 2) { ids.push(String(raw[i])); scores.push(Number(raw[i + 1])); }
  let mine: (ArcadeEntry & { pos: number }) | null = null;
  if (player) {
    const [rank, score] = await Promise.all([redis.zrevrank(AK.rank(date), player), redis.zscore(AK.rank(date), player)]);
    if (rank !== null && score !== null) mine = { name: "", score: Number(score), me: true, pos: rank + 1 };
  }
  const want = [...ids, ...(mine && player ? [player] : [])];
  const names = want.length ? ((await redis.hmget<Record<string, string>>(AK.names(date), ...want)) ?? {}) : {};
  if (mine && player) mine.name = names[player] ?? "Você";
  return { top: ids.map((id, i) => ({ name: names[id] ?? "?", score: scores[i], me: id === player })), mine, players };
}
