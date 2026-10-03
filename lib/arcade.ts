// Arcade: um jogo por dia, sempre com uma variação nova (fase, cores, velocidade e meta).
// Como o resto do site, tudo sai da data: o mesmo dia gera o mesmo jogo para todo mundo.
import { dayNumber, LAUNCH, rng, shuffle } from "./day";

export type Controls = "dpad" | "lr-a" | "a" | "rot";

export type GameInfo = {
  slug: string;
  name: string;
  emoji: string;
  how: string;
  controls: Controls;
  variants: string[];
  /** meta base do dia (pontos) */
  goal: number;
  /** maior pontuação aceita (contra trapaça boba) */
  max: number;
};

export const GAMES: GameInfo[] = [
  { slug: "cobrinha", name: "Cobrinha", emoji: "🐍", controls: "dpad", goal: 150, max: 20000,
    how: "Coma as frutas e não bata em nada. A fruta dourada vale 5 vezes mais.",
    variants: ["Campo aberto", "Muralha", "Pilares", "Labirinto"] },
  { slug: "quebra-blocos", name: "Quebra-Blocos", emoji: "🧱", controls: "lr-a", goal: 400, max: 60000,
    how: "Rebata a bolinha e quebre todos os blocos. Você tem 3 vidas.",
    variants: ["Clássico", "Pirâmide", "Xadrez", "Diamante"] },
  { slug: "invasores", name: "Invasores", emoji: "👾", controls: "lr-a", goal: 600, max: 80000,
    how: "Atire nos invasores antes que eles cheguem lá embaixo. Você tem 3 vidas.",
    variants: ["Esquadrão", "Cunha", "Colmeia", "Muralha"] },
  { slug: "pingue-pongue", name: "Pingue-Pongue", emoji: "🏓", controls: "lr-a", goal: 300, max: 50000,
    how: "Rebata a bola e faça gol na máquina. Ela vence quando fizer 5.",
    variants: ["Novato", "Veterano", "Craque", "Lenda"] },
  { slug: "blocos", name: "Blocos", emoji: "🟪", controls: "rot", goal: 500, max: 200000,
    how: "Encaixe as peças e complete linhas. ▲ gira, ▼ desce, A derruba.",
    variants: ["Limpo", "Entulho", "Escada", "Muito entulho"] },
  { slug: "asteroides", name: "Asteroides", emoji: "☄️", controls: "rot", goal: 500, max: 80000,
    how: "Gire a nave, acelere com ▲ e atire com A. Você tem 3 vidas.",
    variants: ["Chuvisco", "Tempestade", "Cinturão", "Caos"] },
  { slug: "voo", name: "Voo Livre", emoji: "🐦", controls: "a", goal: 10, max: 5000,
    how: "Toque (ou A) para bater as asas e passar entre os canos.",
    variants: ["Canos", "Prédios", "Ventania", "Caverna"] },
  { slug: "corrida", name: "Corrida", emoji: "🏎️", controls: "lr-a", goal: 800, max: 100000,
    how: "Desvie dos carros e pegue as moedas. A pista fica cada vez mais rápida.",
    variants: ["Estrada", "Rodovia", "Avenida", "Noturna"] },
];

export type Palette = { name: string; bg: string; fg: string; a: string; b: string; c: string; d: string };

export const PALETTES: Palette[] = [
  { name: "Neon", bg: "#120d1d", fg: "#f7f0e3", a: "#ff3fa4", b: "#2fd6ff", c: "#ffd23f", d: "#7cff6b" },
  { name: "Game Boy", bg: "#0f380f", fg: "#9bbc0f", a: "#8bac0f", b: "#9bbc0f", c: "#e0f8d0", d: "#306230" },
  { name: "CGA", bg: "#000000", fg: "#ffffff", a: "#ff55ff", b: "#55ffff", c: "#ffffff", d: "#ff55ff" },
  { name: "Pôr do sol", bg: "#1a0b2e", fg: "#ffe8d6", a: "#ff6b35", b: "#f7c59f", c: "#ffd23f", d: "#ef476f" },
  { name: "Fliperama", bg: "#050a30", fg: "#e9f1ff", a: "#ff2e63", b: "#08d9d6", c: "#f9ed69", d: "#3ddc97" },
  { name: "Menta", bg: "#062925", fg: "#d8fff4", a: "#3ae374", b: "#7efff5", c: "#fffa65", d: "#ff9f43" },
  { name: "Âmbar", bg: "#140b00", fg: "#ffb000", a: "#ffcc00", b: "#ff8800", c: "#ffe9a8", d: "#ff5e00" },
  { name: "Gelo", bg: "#0b1a2b", fg: "#eaf6ff", a: "#5ac8fa", b: "#a0e7ff", c: "#ffffff", d: "#ff6b9a" },
];

const SPEEDS = [
  { name: "Tranquilo", v: 0.85 },
  { name: "Normal", v: 1 },
  { name: "Normal", v: 1 },
  { name: "Ligeiro", v: 1.15 },
  { name: "Turbo", v: 1.3 },
];

export type Daily = {
  date: string;
  number: number;
  game: GameInfo;
  variant: number;
  variantName: string;
  palette: Palette;
  speed: number;
  speedName: string;
  target: number;
  seed: string;
};

/** Jogo do dia: os jogos giram em ciclos embaralhados, nunca o mesmo dois dias seguidos. */
export function gameIndexFor(date: string): number {
  const n = GAMES.length;
  const dn = dayNumber(date) - dayNumber(LAUNCH);
  const order = (cycle: number) => shuffle([...GAMES.keys()], rng(`arcade:${cycle}`));
  const cycle = Math.floor(dn / n);
  const pos = ((dn % n) + n) % n;
  const cur = order(cycle);
  // na virada do ciclo, se repetir o último jogo do ciclo anterior, troca com o seguinte
  const prevLast = order(cycle - 1)[n - 1];
  if (cur[0] === prevLast) [cur[0], cur[1]] = [cur[1], cur[0]];
  return cur[pos];
}

export function dailyFor(date: string): Daily {
  const game = GAMES[gameIndexFor(date)];
  const r = rng(`arcade-var:${date}`);
  const variant = Math.floor(r() * game.variants.length);
  const palette = PALETTES[Math.floor(r() * PALETTES.length)];
  const sp = SPEEDS[Math.floor(r() * SPEEDS.length)];
  const target = Math.max(1, Math.round((game.goal * (0.8 + r() * 0.5) * sp.v) / (game.goal >= 100 ? 10 : 1)) * (game.goal >= 100 ? 10 : 1));
  return {
    date,
    number: dayNumber(date) - dayNumber(LAUNCH) + 1,
    game,
    variant,
    variantName: game.variants[variant],
    palette,
    speed: sp.v,
    speedName: sp.name,
    target,
    seed: `arcade-seed:${date}`,
  };
}

export const cleanNick = (s: unknown) =>
  String(s ?? "")
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
