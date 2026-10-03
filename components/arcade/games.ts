// Os jogos do Arcade. Cada jogo recebe a "api" (tela, cores, controles, velocidade e fase do dia)
// e devolve update/draw. A tela lógica é sempre 240×320 (em pé, cabe bem no celular).
import type { Palette } from "@/lib/arcade";

export type Key = "left" | "right" | "up" | "down" | "a";

export type Api = {
  g: CanvasRenderingContext2D;
  W: number;
  H: number;
  pal: Palette;
  speed: number;
  variant: number;
  /** aleatório com semente do dia: todo mundo recebe a mesma sequência */
  r: () => number;
  held: Record<Key, boolean>;
  /** true só no quadro em que a tecla foi apertada */
  hit: (k: Key) => boolean;
  pointer: { x: number; y: number; down: boolean; active: boolean };
  add: (n: number) => void;
  over: () => void;
  font: string;
};

export type Game = { update(dt: number): void; draw(): void; /** o que um toque na tela faz */ tap?: Key | null };

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function rect(api: Api, x: number, y: number, w: number, h: number, c: string) {
  api.g.fillStyle = c;
  api.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function text(api: Api, s: string, x: number, y: number, size: number, c: string, align: CanvasTextAlign = "center") {
  const g = api.g;
  g.fillStyle = c;
  g.font = `${size}px ${api.font}`;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}
function clear(api: Api) {
  rect(api, 0, 0, api.W, api.H, api.pal.bg);
}
function lives(api: Api, n: number) {
  for (let i = 0; i < n; i++) rect(api, api.W - 12 - i * 10, 6, 7, 7, api.pal.a);
}
/** desenha um sprite de bits ("1" pinta) */
function sprite(api: Api, rows: string[], x: number, y: number, px: number, c: string) {
  api.g.fillStyle = c;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === "1") api.g.fillRect(Math.round(x + i * px), Math.round(y + j * px), px, px);
  });
}

// ---------------------------------------------------------------- Cobrinha
function cobrinha(api: Api): Game {
  const C = 12, COLS = 20, ROWS = 26, OY = 4;
  const wall = new Set<number>();
  const k = (x: number, y: number) => y * COLS + x;
  const v = api.variant;
  if (v >= 1) for (let i = 0; i < COLS; i++) wall.add(k(i, 0)).add(k(i, ROWS - 1));
  if (v >= 1) for (let j = 0; j < ROWS; j++) wall.add(k(0, j)).add(k(COLS - 1, j));
  if (v === 2) for (const [px, py] of [[5, 6], [13, 6], [5, 18], [13, 18]]) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) wall.add(k(px + a, py + b));
  if (v === 3) {
    for (let i = 4; i < 16; i++) if (i < 8 || i > 11) wall.add(k(i, 8)).add(k(i, 17));
    for (let j = 11; j < 15; j++) wall.add(k(10, j));
  }
  let snake = [[6, 13], [5, 13], [4, 13], [3, 13]];
  let dir = [1, 0];
  const queue: number[][] = [];
  let acc = 0;
  let fruit = [0, 0];
  let gold: { x: number; y: number; t: number } | null = null;
  let blink = 0;
  const free = () => {
    for (let n = 0; n < 500; n++) {
      const x = Math.floor(api.r() * COLS), y = Math.floor(api.r() * ROWS);
      if (!wall.has(k(x, y)) && !snake.some((s) => s[0] === x && s[1] === y)) return [x, y];
    }
    return [1, 1];
  };
  fruit = free();
  const turns: [Key, number[]][] = [["left", [-1, 0]], ["right", [1, 0]], ["up", [0, -1]], ["down", [0, 1]]];
  return {
    tap: null,
    update(dt) {
      blink += dt;
      for (const [key, d] of turns) {
        if (!api.hit(key)) continue;
        const last = queue[queue.length - 1] ?? dir;
        if (last[0] + d[0] !== 0 || last[1] + d[1] !== 0) if (queue.length < 3) queue.push(d);
      }
      if (gold && (gold.t -= dt) <= 0) gold = null;
      acc += dt;
      const step = Math.max(0.055, (0.13 - snake.length * 0.0012) / api.speed);
      while (acc >= step) {
        acc -= step;
        if (queue.length) dir = queue.shift()!;
        let x = snake[0][0] + dir[0], y = snake[0][1] + dir[1];
        if (v === 0) { x = (x + COLS) % COLS; y = (y + ROWS) % ROWS; }
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS || wall.has(k(x, y)) || snake.slice(0, -1).some((s) => s[0] === x && s[1] === y)) return api.over();
        snake.unshift([x, y]);
        if (x === fruit[0] && y === fruit[1]) {
          api.add(10);
          fruit = free();
          if (!gold && api.r() < 0.18) { const [gx, gy] = free(); gold = { x: gx, y: gy, t: 6 }; }
        } else if (gold && x === gold.x && y === gold.y) {
          api.add(50);
          gold = null;
          snake.push(snake[snake.length - 1]);
        } else snake.pop();
      }
    },
    draw() {
      clear(api);
      const p = api.pal;
      for (const w of wall) rect(api, (w % COLS) * C, Math.floor(w / COLS) * C + OY, C, C, p.b);
      rect(api, fruit[0] * C + 2, fruit[1] * C + OY + 2, C - 4, C - 4, p.a);
      if (gold && (gold.t > 2 || Math.floor(blink * 8) % 2)) rect(api, gold.x * C + 1, gold.y * C + OY + 1, C - 2, C - 2, p.c);
      snake.forEach((s, i) => rect(api, s[0] * C + 1, s[1] * C + OY + 1, C - 2, C - 2, i === 0 ? p.c : p.d));
    },
  };
}

// ---------------------------------------------------------------- Quebra-Blocos
function quebraBlocos(api: Api): Game {
  const { W, H, pal } = api;
  const BW = 22, BH = 10, COLS = 10, TOP = 34;
  let bricks: { x: number; y: number; c: string; row: number }[] = [];
  let wave = 0;
  const colors = [pal.a, pal.c, pal.b, pal.d];
  const layout = (r: number, c: number) => {
    switch (api.variant) {
      case 1: return r < 8 && Math.abs(c - 4.5) < r * 0.62 + 0.6;
      case 2: return r < 8 && (r + c) % 2 === 0;
      case 3: return Math.abs(c - 4.5) / 5 + Math.abs(r - 3.5) / 4 <= 1;
      default: return r < 6;
    }
  };
  const build = () => {
    bricks = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < COLS; c++) if (layout(r, c)) bricks.push({ x: 1 + c * (BW + 2), y: TOP + r * (BH + 3), c: colors[r % 4], row: r });
  };
  build();
  const pad = { x: W / 2, w: 44, y: H - 22 };
  let ball = { x: 0, y: 0, vx: 0, vy: 0, stuck: true };
  let life = 3, wait = 0;
  const base = () => 165 * api.speed * (1 + wave * 0.08);
  const serve = () => { ball = { x: pad.x, y: pad.y - 5, vx: 0, vy: 0, stuck: true }; wait = 0; };
  serve();
  const launch = () => {
    const a = -Math.PI / 2 + (api.r() - 0.5) * 0.8;
    ball.vx = Math.cos(a) * base(); ball.vy = Math.sin(a) * base(); ball.stuck = false;
  };
  return {
    tap: "a",
    update(dt) {
      if (api.pointer.active) pad.x += clamp(api.pointer.x - pad.x, -400 * dt, 400 * dt);
      else pad.x += ((api.held.right ? 1 : 0) - (api.held.left ? 1 : 0)) * 230 * api.speed * dt;
      pad.x = clamp(pad.x, pad.w / 2, W - pad.w / 2);
      if (ball.stuck) {
        ball.x = pad.x; ball.y = pad.y - 5;
        wait += dt;
        if (api.hit("a") || wait > 2.5) launch();
        return;
      }
      // passos menores para a bolinha não atravessar blocos
      const steps = Math.ceil((Math.hypot(ball.vx, ball.vy) * dt) / 3);
      for (let s = 0; s < steps; s++) {
        const px = ball.x, py = ball.y;
        ball.x += (ball.vx * dt) / steps; ball.y += (ball.vy * dt) / steps;
        if (ball.x < 3 || ball.x > W - 3) { ball.vx *= -1; ball.x = clamp(ball.x, 3, W - 3); }
        if (ball.y < 3) { ball.vy = Math.abs(ball.vy); }
        if (ball.vy > 0 && ball.y + 3 >= pad.y && ball.y < pad.y + 6 && Math.abs(ball.x - pad.x) < pad.w / 2 + 3) {
          const sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.02, base() * 1.6);
          const a = -Math.PI / 2 + ((ball.x - pad.x) / (pad.w / 2)) * 1.05;
          ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.y = pad.y - 3;
        }
        const i = bricks.findIndex((b) => ball.x > b.x - 3 && ball.x < b.x + BW + 3 && ball.y > b.y - 3 && ball.y < b.y + BH + 3);
        if (i >= 0) {
          const b = bricks[i];
          if (px <= b.x - 3 || px >= b.x + BW + 3) ball.vx *= -1; else ball.vy *= -1;
          ball.x = px; ball.y = py;
          bricks.splice(i, 1);
          api.add(10 + (7 - b.row) * 2 + wave * 5);
          break;
        }
        if (ball.y > H + 6) {
          if (--life <= 0) return api.over();
          return serve();
        }
      }
      if (!bricks.length) { wave++; api.add(200); build(); serve(); }
    },
    draw() {
      clear(api);
      for (const b of bricks) { rect(api, b.x, b.y, BW, BH, b.c); rect(api, b.x, b.y + BH - 2, BW, 2, "rgba(0,0,0,.25)"); }
      rect(api, pad.x - pad.w / 2, pad.y, pad.w, 6, pal.fg);
      rect(api, ball.x - 3, ball.y - 3, 6, 6, pal.c);
      lives(api, life);
      if (ball.stuck) text(api, "A / toque para lançar", W / 2, H - 50, 16, pal.fg);
    },
  };
}

// ---------------------------------------------------------------- Invasores
const ALIENS = [
  [["00100100", "00011000", "00111100", "01011010", "11111111", "10100101"], ["00100100", "10011001", "10111101", "11011011", "01111110", "01000010"]],
  [["00011000", "00111100", "01111110", "11011011", "11111111", "01011010"], ["00011000", "00111100", "01111110", "11011011", "11111111", "10100101"]],
];
function invasores(api: Api): Game {
  const { W, H, pal } = api;
  const ROWS = api.variant === 3 ? 6 : 5, COLS = 8;
  const mask = (r: number, c: number) =>
    api.variant === 1 ? Math.abs(c - 3.5) <= r + 0.5 : api.variant === 2 ? (r + c) % 2 === 0 || r === 0 : true;
  let aliens: { x: number; y: number; r: number; alive: boolean }[] = [];
  let wave = 0, dirx = 1, total = 0, frame = 0, ft = 0, bombT = 1;
  const build = () => {
    aliens = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (mask(r, c)) aliens.push({ x: 20 + c * 24, y: 30 + r * 20 + Math.min(wave, 4) * 6, r, alive: true });
    total = aliens.length; dirx = 1;
  };
  build();
  const ship = { x: W / 2, y: H - 20 };
  let shot: { x: number; y: number } | null = null;
  let bombs: { x: number; y: number }[] = [];
  let life = 3, inv = 0, cd = 0;
  return {
    tap: "a",
    update(dt) {
      if (api.pointer.active) ship.x += clamp(api.pointer.x - ship.x, -260 * dt, 260 * dt);
      else ship.x += ((api.held.right ? 1 : 0) - (api.held.left ? 1 : 0)) * 130 * api.speed * dt;
      ship.x = clamp(ship.x, 10, W - 10);
      cd -= dt; inv -= dt;
      if (!shot && cd <= 0 && (api.hit("a") || api.held.a || api.pointer.down)) { shot = { x: ship.x, y: ship.y - 8 }; cd = 0.3; }
      if (shot && (shot.y -= 300 * dt) < 0) shot = null;
      const alive = aliens.filter((a) => a.alive);
      const sp = 16 * api.speed * (1 + wave * 0.15) * (1 + (1 - alive.length / total) * 3);
      let edge = false;
      for (const a of alive) { a.x += dirx * sp * dt; if (a.x < 6 || a.x > W - 22) edge = true; }
      if (edge) { dirx *= -1; for (const a of alive) { a.x += dirx * 2; a.y += 8; } }
      if ((ft += dt) > 0.45) { ft = 0; frame ^= 1; }
      if (shot) {
        const hitA = alive.find((a) => shot!.x > a.x && shot!.x < a.x + 16 && shot!.y > a.y && shot!.y < a.y + 12);
        if (hitA) { hitA.alive = false; shot = null; api.add(10 + (ROWS - hitA.r) * 10); }
      }
      if ((bombT -= dt) <= 0 && alive.length) {
        bombT = (1.1 - Math.min(wave, 5) * 0.12) / api.speed;
        const a = alive[Math.floor(api.r() * alive.length)];
        bombs.push({ x: a.x + 8, y: a.y + 12 });
      }
      for (const b of bombs) b.y += 110 * api.speed * dt;
      bombs = bombs.filter((b) => {
        if (b.y > H) return false;
        if (inv <= 0 && Math.abs(b.x - ship.x) < 9 && b.y > ship.y - 6 && b.y < ship.y + 6) {
          inv = 1.6;
          if (--life <= 0) api.over();
          return false;
        }
        return true;
      });
      if (alive.some((a) => a.y > ship.y - 24)) return api.over();
      if (!alive.length) { wave++; api.add(300); build(); bombs = []; }
    },
    draw() {
      clear(api);
      for (const a of aliens) if (a.alive) sprite(api, ALIENS[a.r % 2][frame], a.x, a.y, 2, a.r < 2 ? pal.a : a.r < 4 ? pal.b : pal.d);
      if (inv <= 0 || Math.floor(inv * 10) % 2) sprite(api, ["00011000", "00111100", "11111111", "11111111"], ship.x - 8, ship.y - 4, 2, pal.c);
      if (shot) rect(api, shot.x - 1, shot.y, 2, 7, pal.fg);
      for (const b of bombs) rect(api, b.x - 1, b.y, 3, 6, pal.a);
      rect(api, 0, H - 8, W, 1, pal.d);
      lives(api, life);
    },
  };
}

// ---------------------------------------------------------------- Pingue-pongue
function pongue(api: Api): Game {
  const { W, H, pal } = api;
  const me = { x: W / 2, w: 42, y: H - 16 };
  const cpu = { x: W / 2, w: 42, y: 10 };
  const cpuSpeed = [85, 115, 145, 180][api.variant] * api.speed;
  let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  let wait = 1, toward = 1, cpuGoals = 0, myGoals = 0, aim = 0;
  const serve = () => {
    const a = (api.r() - 0.5) * 0.9;
    const sp = 150 * api.speed;
    ball = { x: W / 2, y: H / 2, vx: Math.sin(a) * sp, vy: Math.cos(a) * sp * toward };
  };
  return {
    tap: null,
    update(dt) {
      if (api.pointer.active) me.x += clamp(api.pointer.x - me.x, -420 * dt, 420 * dt);
      else me.x += ((api.held.right ? 1 : 0) - (api.held.left ? 1 : 0)) * 240 * api.speed * dt;
      me.x = clamp(me.x, me.w / 2, W - me.w / 2);
      // a máquina erra um pouco de propósito (mais nas fases fáceis)
      const target = ball.vy < 0 ? ball.x + aim : W / 2;
      cpu.x += clamp(target - cpu.x, -cpuSpeed * dt, cpuSpeed * dt);
      cpu.x = clamp(cpu.x, cpu.w / 2, W - cpu.w / 2);
      if (wait > 0) { if ((wait -= dt) <= 0) serve(); return; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < 3 || ball.x > W - 3) { ball.vx *= -1; ball.x = clamp(ball.x, 3, W - 3); }
      const bounce = (p: typeof me, dirY: number) => {
        const sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, 420);
        const a = ((ball.x - p.x) / (p.w / 2)) * 1.0;
        ball.vx = Math.sin(a) * sp; ball.vy = Math.cos(a) * sp * dirY;
      };
      if (ball.vy > 0 && ball.y + 3 >= me.y && ball.y < me.y + 6 && Math.abs(ball.x - me.x) < me.w / 2 + 3) {
        bounce(me, -1); ball.y = me.y - 3; api.add(10);
        aim = (api.r() - 0.5) * [44, 34, 24, 14][api.variant];
      }
      if (ball.vy < 0 && ball.y - 3 <= cpu.y + 6 && ball.y > cpu.y && Math.abs(ball.x - cpu.x) < cpu.w / 2 + 3) { bounce(cpu, 1); ball.y = cpu.y + 9; }
      if (ball.y < -6) { myGoals++; api.add(100); toward = -1; wait = 1; ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }; }
      if (ball.y > H + 6) {
        cpuGoals++; toward = 1; wait = 1; ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
        if (cpuGoals >= 5) api.over();
      }
    },
    draw() {
      clear(api);
      for (let x = 4; x < W; x += 14) rect(api, x, H / 2 - 1, 7, 2, pal.d);
      text(api, String(cpuGoals), W - 16, H / 2 - 22, 28, pal.b);
      text(api, String(myGoals), W - 16, H / 2 + 22, 28, pal.c);
      rect(api, cpu.x - cpu.w / 2, cpu.y, cpu.w, 6, pal.b);
      rect(api, me.x - me.w / 2, me.y, me.w, 6, pal.c);
      rect(api, ball.x - 3, ball.y - 3, 6, 6, pal.fg);
    },
  };
}

// ---------------------------------------------------------------- Blocos
const PIECES = [
  [[0, 0], [1, 0], [2, 0], [3, 0]], // I
  [[0, 0], [1, 0], [0, 1], [1, 1]], // O
  [[0, 0], [1, 0], [2, 0], [1, 1]], // T
  [[1, 0], [2, 0], [0, 1], [1, 1]], // S
  [[0, 0], [1, 0], [1, 1], [2, 1]], // Z
  [[0, 0], [0, 1], [1, 1], [2, 1]], // J
  [[2, 0], [0, 1], [1, 1], [2, 1]], // L
];
function blocos(api: Api): Game {
  const { pal } = api;
  const C = 15, COLS = 10, ROWS = 20, OX = 8, OY = 10;
  const colors = [pal.b, pal.c, pal.a, pal.d, pal.a, pal.b, pal.c];
  const grid: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const garbage = [0, 4, 0, 8][api.variant];
  for (let j = ROWS - garbage; j < ROWS; j++) {
    const hole = Math.floor(api.r() * COLS);
    for (let i = 0; i < COLS; i++) if (i !== hole && api.r() < 0.85) grid[j][i] = pal.fg + "88";
  }
  if (api.variant === 2) for (let j = ROWS - 6; j < ROWS; j++) for (let i = 0; i < COLS; i++) if (i < (j - (ROWS - 6)) + 2 && i !== COLS - 1) grid[j][i] = pal.fg + "88";
  let bag: number[] = [];
  const nextType = () => {
    if (!bag.length) { bag = [0, 1, 2, 3, 4, 5, 6]; for (let i = 6; i > 0; i--) { const j = Math.floor(api.r() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    return bag.pop()!;
  };
  let cur = { t: 0, cells: [[0, 0]], x: 3, y: 0 };
  let next = nextType();
  let lines = 0, level = 0, fall = 0, das = 0, soft = 0;
  const fits = (cells: number[][], x: number, y: number) =>
    cells.every(([cx, cy]) => { const gx = x + cx, gy = y + cy; return gx >= 0 && gx < COLS && gy < ROWS && (gy < 0 || !grid[gy][gx]); });
  const spawn = () => {
    cur = { t: next, cells: PIECES[next].map((c) => [...c]), x: 3, y: 0 };
    next = nextType();
    if (!fits(cur.cells, cur.x, cur.y)) api.over();
  };
  spawn();
  const lock = () => {
    for (const [cx, cy] of cur.cells) if (cur.y + cy >= 0) grid[cur.y + cy][cur.x + cx] = colors[cur.t];
    let n = 0;
    for (let j = ROWS - 1; j >= 0; j--) {
      if (grid[j].every(Boolean)) { grid.splice(j, 1); grid.unshift(Array(COLS).fill(null)); n++; j++; }
    }
    if (n) { lines += n; api.add([0, 40, 100, 300, 1200][n] * (level + 1)); level = Math.floor(lines / 10); }
    spawn();
  };
  const rotate = () => {
    if (cur.t === 1) return;
    const w = Math.max(...cur.cells.map((c) => c[0]));
    const rot = cur.cells.map(([x, y]) => [w - y, x]).map(([x, y]) => [x - (cur.t === 0 ? 1 : 0), y]);
    const minX = Math.min(...rot.map((c) => c[0])), minY = Math.min(...rot.map((c) => c[1]));
    const norm = rot.map(([x, y]) => [x - minX, y - minY]);
    for (const kick of [0, -1, 1, -2, 2]) if (fits(norm, cur.x + kick, cur.y)) { cur.cells = norm; cur.x += kick; return; }
  };
  const move = (dx: number) => { if (fits(cur.cells, cur.x + dx, cur.y)) cur.x += dx; };
  return {
    tap: "up",
    update(dt) {
      if (api.hit("left")) { move(-1); das = -0.17; }
      if (api.hit("right")) { move(1); das = -0.17; }
      if (api.held.left || api.held.right) { das += dt; while (das > 0.05) { das -= 0.05; move(api.held.left ? -1 : 1); } }
      if (api.hit("up")) rotate();
      if (api.hit("a")) {
        let d = 0;
        while (fits(cur.cells, cur.x, cur.y + 1)) { cur.y++; d++; }
        api.add(d * 2); lock(); return;
      }
      if (api.held.down) {
        soft += dt;
        while (soft > 0.04) { soft -= 0.04; if (fits(cur.cells, cur.x, cur.y + 1)) { cur.y++; api.add(1); } else { lock(); return; } }
      }
      fall += dt;
      const g = Math.max(0.07, (0.8 / api.speed) * Math.pow(0.86, level));
      while (fall > g) { fall -= g; if (fits(cur.cells, cur.x, cur.y + 1)) cur.y++; else { lock(); return; } }
    },
    draw() {
      clear(api);
      rect(api, OX - 2, OY - 2, COLS * C + 4, ROWS * C + 4, pal.d);
      rect(api, OX, OY, COLS * C, ROWS * C, pal.bg);
      const cell = (x: number, y: number, c: string) => { rect(api, OX + x * C, OY + y * C, C - 1, C - 1, c); rect(api, OX + x * C, OY + y * C, C - 1, 2, "rgba(255,255,255,.25)"); };
      grid.forEach((row, j) => row.forEach((c, i) => c && cell(i, j, c)));
      let gy = cur.y;
      while (fits(cur.cells, cur.x, gy + 1)) gy++;
      for (const [cx, cy] of cur.cells) rect(api, OX + (cur.x + cx) * C + 2, OY + (gy + cy) * C + 2, C - 5, C - 5, "rgba(255,255,255,.12)");
      for (const [cx, cy] of cur.cells) if (cur.y + cy >= 0) cell(cur.x + cx, cur.y + cy, colors[cur.t]);
      const px = OX + COLS * C + 12;
      text(api, "PRÓXIMA", px + 30, 22, 16, pal.fg);
      for (const [cx, cy] of PIECES[next]) rect(api, px + 4 + cx * 12, 38 + cy * 12, 11, 11, colors[next]);
      text(api, "LINHAS", px + 30, 100, 16, pal.fg);
      text(api, String(lines), px + 30, 120, 26, pal.c);
      text(api, "NÍVEL", px + 30, 156, 16, pal.fg);
      text(api, String(level + 1), px + 30, 176, 26, pal.c);
    },
  };
}

// ---------------------------------------------------------------- Asteroides
function asteroides(api: Api): Game {
  const { W, H, pal } = api;
  type Rock = { x: number; y: number; vx: number; vy: number; s: number; shape: number[]; rot: number; vr: number };
  const R = [0, 7, 13, 24];
  let rocks: Rock[] = [];
  let wave = 0;
  const ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 };
  let bullets: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  let life = 3, inv = 2, cd = 0, flame = 0;
  const rock = (x: number, y: number, s: number): Rock => {
    const a = api.r() * TAU, sp = (25 + api.r() * 35) * api.speed * (1 + wave * 0.1) * (s === 1 ? 1.5 : 1);
    return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s, shape: Array.from({ length: 10 }, () => 0.7 + api.r() * 0.4), rot: 0, vr: (api.r() - 0.5) * 2 };
  };
  const build = () => {
    const n = [3, 4, 5, 6][api.variant] + wave;
    rocks = [];
    for (let i = 0; i < n; i++) {
      const edge = api.r() < 0.5;
      rocks.push(rock(edge ? 0 : api.r() * W, edge ? api.r() * H : 0, 3));
    }
  };
  build();
  const wrap = (o: { x: number; y: number }) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };
  return {
    tap: "a",
    update(dt) {
      ship.a += ((api.held.right ? 1 : 0) - (api.held.left ? 1 : 0)) * 4.2 * dt;
      flame = api.held.up ? flame + dt : 0;
      if (api.held.up) { ship.vx += Math.cos(ship.a) * 160 * dt; ship.vy += Math.sin(ship.a) * 160 * dt; }
      const damp = Math.pow(0.55, dt);
      ship.vx *= damp; ship.vy *= damp;
      const sp = Math.hypot(ship.vx, ship.vy);
      if (sp > 190) { ship.vx *= 190 / sp; ship.vy *= 190 / sp; }
      ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
      cd -= dt; inv -= dt;
      if (cd <= 0 && bullets.length < 5 && (api.hit("a") || api.held.a)) {
        bullets.push({ x: ship.x + Math.cos(ship.a) * 8, y: ship.y + Math.sin(ship.a) * 8, vx: Math.cos(ship.a) * 250 + ship.vx, vy: Math.sin(ship.a) * 250 + ship.vy, t: 0.9 });
        cd = 0.18;
      }
      for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; wrap(b); }
      for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r); }
      bullets = bullets.filter((b) => {
        if (b.t <= 0) return false;
        const i = rocks.findIndex((r) => Math.hypot(r.x - b.x, r.y - b.y) < R[r.s]);
        if (i < 0) return true;
        const r = rocks[i];
        rocks.splice(i, 1);
        api.add([0, 100, 50, 20][r.s]);
        if (r.s > 1) rocks.push(rock(r.x, r.y, r.s - 1), rock(r.x, r.y, r.s - 1));
        return false;
      });
      if (inv <= 0 && rocks.some((r) => Math.hypot(r.x - ship.x, r.y - ship.y) < R[r.s] + 5)) {
        if (--life <= 0) return api.over();
        Object.assign(ship, { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 });
        inv = 2.5;
      }
      if (!rocks.length) { wave++; api.add(250); build(); inv = 1.5; }
    },
    draw() {
      clear(api);
      const g = api.g;
      g.lineWidth = 1.5;
      g.strokeStyle = pal.b;
      for (const r of rocks) {
        g.beginPath();
        r.shape.forEach((m, i) => { const a = r.rot + (i / r.shape.length) * TAU; const x = r.x + Math.cos(a) * R[r.s] * m, y = r.y + Math.sin(a) * R[r.s] * m; i ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.closePath(); g.stroke();
      }
      if (inv <= 0 || Math.floor(inv * 10) % 2) {
        const p = (d: number, a: number) => [ship.x + Math.cos(ship.a + a) * d, ship.y + Math.sin(ship.a + a) * d];
        g.strokeStyle = pal.c;
        g.beginPath();
        g.moveTo(...(p(9, 0) as [number, number])); g.lineTo(...(p(7, 2.5) as [number, number])); g.lineTo(...(p(3, Math.PI) as [number, number])); g.lineTo(...(p(7, -2.5) as [number, number])); g.closePath(); g.stroke();
        if (flame && Math.floor(flame * 20) % 2) { g.strokeStyle = pal.a; g.beginPath(); g.moveTo(...(p(5, 2.8) as [number, number])); g.lineTo(...(p(12, Math.PI) as [number, number])); g.lineTo(...(p(5, -2.8) as [number, number])); g.stroke(); }
      }
      for (const b of bullets) rect(api, b.x - 1, b.y - 1, 2, 2, pal.fg);
      lives(api, life);
    },
  };
}

// ---------------------------------------------------------------- Voo livre
function voo(api: Api): Game {
  const { W, H, pal } = api;
  const v = api.variant;
  const gap = [92, 90, 80, 96][v];
  const gravity = v === 2 ? 780 : 700;
  const bird = { x: 64, y: H / 2, vy: -220 };
  let pipes: { x: number; y: number; ph: number; passed: boolean; win: number[] }[] = [];
  let dist = 0, t = 0;
  const add = (x: number) => pipes.push({ x, y: 50 + api.r() * (H - 100 - gap), ph: api.r() * TAU, passed: false, win: Array.from({ length: 24 }, () => (api.r() < 0.55 ? 1 : 0)) });
  add(W + 20);
  return {
    tap: "a",
    update(dt) {
      t += dt;
      if (api.hit("a") || api.hit("up")) bird.vy = -235;
      bird.vy += gravity * dt;
      bird.y += bird.vy * dt;
      const sp = 82 * api.speed * (1 + Math.min(dist / 6000, 0.4));
      dist += sp * dt;
      for (const p of pipes) {
        p.x -= sp * dt;
        if (v === 3) p.y = clamp(p.y + Math.sin(t * 1.6 + p.ph) * 22 * dt, 30, H - 30 - gap);
        if (!p.passed && p.x + 34 < bird.x) { p.passed = true; api.add(1); }
      }
      if (pipes[pipes.length - 1].x < W - 132) add(W + 4);
      pipes = pipes.filter((p) => p.x > -40);
      if (bird.y < 4 || bird.y > H - 14) return api.over();
      for (const p of pipes) if (bird.x + 6 > p.x && bird.x - 6 < p.x + 34 && (bird.y - 5 < p.y || bird.y + 5 > p.y + gap)) return api.over();
    },
    draw() {
      clear(api);
      const g = api.g;
      for (let i = 0; i < 18; i++) rect(api, (i * 53 + 13 - dist * 0.2) % (W + 20) - 10, (i * 37) % (H - 60), 2, 2, pal.fg + "66");
      for (const p of pipes) {
        const col = v === 1 ? pal.b : pal.d;
        rect(api, p.x, 0, 34, p.y, col);
        rect(api, p.x, p.y + gap, 34, H - p.y - gap, col);
        if (v === 1) {
          // prédios com janelas
          for (let j = 0; j < 12; j++) for (let i = 0; i < 2; i++) {
            const lit = p.win[j * 2 + i] ? pal.c : "rgba(0,0,0,.3)";
            const y1 = p.y - 12 - j * 14, y2 = p.y + gap + 8 + j * 14;
            if (y1 > 0) rect(api, p.x + 6 + i * 14, y1, 8, 7, lit);
            if (y2 < H - 10) rect(api, p.x + 6 + i * 14, y2, 8, 7, lit);
          }
        } else {
          rect(api, p.x - 3, p.y - 10, 40, 10, col);
          rect(api, p.x - 3, p.y + gap, 40, 10, col);
          rect(api, p.x + 4, 0, 4, p.y - 10, "rgba(255,255,255,.18)");
          rect(api, p.x + 4, p.y + gap + 10, 4, H, "rgba(255,255,255,.18)");
        }
      }
      rect(api, 0, H - 10, W, 10, pal.a);
      g.save();
      g.translate(bird.x, bird.y);
      g.rotate(clamp(bird.vy / 500, -0.5, 0.9));
      rect(api, -7, -5, 14, 10, pal.c);
      rect(api, 2, -3, 3, 3, pal.bg);
      rect(api, 6, 0, 5, 3, pal.a);
      rect(api, -6, Math.sin(t * 20) > 0 ? -1 : 2, 7, 3, pal.fg);
      g.restore();
    },
  };
}

// ---------------------------------------------------------------- Corrida
function corrida(api: Api): Game {
  const { W, H, pal } = api;
  const lanes = [3, 4, 5, 4][api.variant];
  const night = api.variant === 3;
  const L = 20, R = W - 20, lw = (R - L) / lanes;
  const car = { x: W / 2, y: H - 48, w: 16, h: 28 };
  let cars: { x: number; y: number; v: number; c: string }[] = [];
  let coins: { x: number; y: number }[] = [];
  let scroll = 0, sp = 120 * api.speed, spawn = 0.8, coinT = 1.5, acc = 0;
  const laneX = (i: number) => L + lw * i + lw / 2;
  const colors = [pal.a, pal.b, pal.d, pal.fg];
  return {
    tap: null,
    update(dt) {
      if (api.pointer.active) car.x += clamp(api.pointer.x - car.x, -300 * dt, 300 * dt);
      else car.x += ((api.held.right ? 1 : 0) - (api.held.left ? 1 : 0)) * 170 * dt;
      car.x = clamp(car.x, L + car.w / 2 + 2, R - car.w / 2 - 2);
      sp = Math.min(sp + 5 * api.speed * dt, 380);
      scroll += sp * dt;
      acc += sp * dt;
      while (acc > 12) { acc -= 12; api.add(1); }
      if ((spawn -= dt) <= 0) {
        spawn = Math.max(0.32, (0.9 - sp / 900) * (4 / lanes) * 1.2) + api.r() * 0.3;
        const lane = Math.floor(api.r() * lanes);
        if (!cars.some((c) => Math.abs(c.x - laneX(lane)) < 2 && c.y < 40)) cars.push({ x: laneX(lane), y: -32, v: 0.35 + api.r() * 0.3, c: colors[Math.floor(api.r() * colors.length)] });
      }
      if ((coinT -= dt) <= 0) { coinT = 1 + api.r() * 1.5; coins.push({ x: laneX(Math.floor(api.r() * lanes)), y: -10 }); }
      for (const c of cars) c.y += sp * c.v * dt;
      for (const c of coins) c.y += sp * dt;
      cars = cars.filter((c) => c.y < H + 40);
      coins = coins.filter((c) => {
        if (Math.abs(c.x - car.x) < 12 && Math.abs(c.y - car.y) < 18) { api.add(50); return false; }
        return c.y < H + 10;
      });
      if (cars.some((c) => Math.abs(c.x - car.x) < car.w - 2 && Math.abs(c.y - car.y) < car.h - 4)) api.over();
    },
    draw() {
      const g = api.g;
      rect(api, 0, 0, W, H, night ? "#000" : pal.d);
      rect(api, L, 0, R - L, H, night ? "#111" : "#3a3a44");
      rect(api, L - 3, 0, 3, H, pal.fg); rect(api, R, 0, 3, H, pal.fg);
      for (let i = 1; i < lanes; i++) for (let y = (scroll % 40) - 40; y < H; y += 40) rect(api, L + lw * i - 1, y, 2, 20, night ? "#666" : pal.fg);
      for (const c of coins) { rect(api, c.x - 5, c.y - 5, 10, 10, pal.c); rect(api, c.x - 2, c.y - 3, 4, 6, "rgba(0,0,0,.25)"); }
      const drawCar = (x: number, y: number, c: string, me: boolean) => {
        rect(api, x - 8, y - 14, 16, 28, c);
        rect(api, x - 6, y + (me ? -8 : 2), 12, 6, "rgba(0,0,0,.45)");
        rect(api, x - 10, y - 10, 2, 6, "#000"); rect(api, x + 8, y - 10, 2, 6, "#000");
        rect(api, x - 10, y + 5, 2, 6, "#000"); rect(api, x + 8, y + 5, 2, 6, "#000");
      };
      for (const c of cars) drawCar(c.x, c.y, c.c, false);
      drawCar(car.x, car.y, pal.c, true);
      if (night) {
        // faróis: escurece tudo fora do cone de luz
        g.save();
        g.fillStyle = "rgba(0,0,0,.82)";
        g.beginPath();
        g.rect(0, 0, W, H);
        g.moveTo(car.x - 14, car.y + 18); g.lineTo(car.x - 14, car.y - 12); g.lineTo(car.x - 50, car.y - 175);
        g.lineTo(car.x + 50, car.y - 175); g.lineTo(car.x + 14, car.y - 12); g.lineTo(car.x + 14, car.y + 18);
        g.closePath();
        g.fill("evenodd");
        g.restore();
      }
    },
  };
}

export const MAKERS: Record<string, (api: Api) => Game> = {
  cobrinha,
  "quebra-blocos": quebraBlocos,
  invasores,
  "pingue-pongue": pongue,
  blocos,
  asteroides,
  voo,
  corrida,
};
