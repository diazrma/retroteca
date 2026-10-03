"use client";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Daily } from "@/lib/arcade";
import { rng } from "@/lib/day";
import { MAKERS, type Api, type Game, type Key } from "./arcade/games";

type Entry = { name: string; score: number; me?: boolean };
type Board = { top: Entry[]; mine: (Entry & { pos: number }) | null; players: number };
type Phase = "ready" | "play" | "paused" | "over";

const W = 240, H = 320, SCALE = 3;
const KEYMAP: Record<string, Key> = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down",
  " ": "a", z: "a", Z: "a", x: "a", X: "a", Enter: "a",
};

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

function useCountdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      // meia-noite em Brasília (UTC-3)
      const now = Date.now();
      const next = Math.ceil((now - 3 * 3600e3) / 86400e3) * 86400e3 + 3 * 3600e3;
      const s = Math.max(0, Math.floor((next - now) / 1000));
      setLeft(`${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

export default function Arcade({ daily, yesterday }: { daily: Daily; yesterday: { name: string; emoji: string; champ: Entry | null } }) {
  const { game, palette } = daily;
  const { data: session, status } = useSession();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [nick, setNick] = useState("");
  const [nickDraft, setNickDraft] = useState("");
  const [board, setBoard] = useState<Board | null>(null);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const left = useCountdown();

  const input = useRef({
    held: { left: false, right: false, up: false, down: false, a: false } as Record<Key, boolean>,
    pressed: new Set<Key>(),
    pointer: { x: W / 2, y: H / 2, down: false, active: false },
  });
  const run = useRef<{ game: Game; score: number; dead: boolean } | null>(null);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;
  const pidRef = useRef("");
  const bestKey = `arcade:best:${daily.date}`;

  // id anônimo + apelido + recorde do dia (só neste navegador)
  useEffect(() => {
    let pid = store.get("arcade:pid");
    if (!pid || !/^[a-z0-9]{8,32}$/.test(pid)) {
      pid = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join("");
      store.set("arcade:pid", pid);
    }
    pidRef.current = pid;
    const n = store.get("arcade:nick") ?? "";
    setNick(n);
    setNickDraft(n);
    setBest(Number(store.get(bestKey)) || 0);
    fetch(`/api/arcade?pid=${pid}`).then((r) => r.json()).then(setBoard).catch(() => {});
  }, [bestKey]);

  const loggedName = session?.user?.name?.split(" ")[0];

  const submit = useCallback(
    async (value: number, name: string) => {
      if (value <= 0) return;
      setMsg("Enviando para o ranking…");
      const r = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: daily.date, score: value, name, pid: pidRef.current }),
      }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (r?.ok && j) {
        setBoard(j);
        setSent(true);
        setMsg(j.mine ? `Você está em ${j.mine.pos}º lugar hoje.` : "Pontuação enviada!");
      } else setMsg(j?.error ?? "Não deu para enviar. Tente de novo.");
    },
    [daily.date],
  );

  const start = useCallback(() => {
    const cv = canvas.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.imageSmoothingEnabled = false;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--f-mono").trim() || "monospace";
    const inp = input.current;
    inp.pressed.clear();
    (Object.keys(inp.held) as Key[]).forEach((k) => (inp.held[k] = false));
    const state = { game: null as unknown as Game, score: 0, dead: false };
    const api: Api = {
      g, W, H, pal: palette, speed: daily.speed, variant: daily.variant,
      r: rng(daily.seed),
      held: inp.held,
      hit: (k) => inp.pressed.has(k),
      pointer: inp.pointer,
      add: (n) => { state.score += n; setScore(state.score); },
      over: () => { state.dead = true; },
      font,
    };
    state.game = MAKERS[game.slug](api);
    run.current = state;
    setScore(0);
    setSent(false);
    setMsg("");
    setPhase("play");
    // deixa a tela e os controles inteiros à vista
    const bezel = document.querySelector(".arcab-bezel");
    const deck = document.querySelector(".arcab-deck");
    if (bezel && deck && (bezel.getBoundingClientRect().top < 0 || deck.getBoundingClientRect().bottom > window.innerHeight - 70)) {
      bezel.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [daily, game.slug, palette]);

  // laço do jogo
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = run.current;
      if (!st) return;
      st.game.update(dt);
      input.current.pressed.clear();
      st.game.draw();
      if (st.dead) {
        setPhase("over");
        const final = st.score;
        if (final > (Number(store.get(bestKey)) || 0)) { store.set(bestKey, String(final)); setBest(final); }
        const name = loggedName || store.get("arcade:nick") || "";
        if (final > 0 && name) submit(final, name);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, bestKey, loggedName, submit]);

  // teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key];
      if (!k || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (phaseRef.current !== "play") {
        if (k === "a" && phaseRef.current !== "paused" && document.activeElement?.tagName !== "BUTTON") { e.preventDefault(); start(); }
        if (phaseRef.current === "paused" && k === "a") { e.preventDefault(); setPhase("play"); }
        return;
      }
      e.preventDefault();
      input.current.pointer.active = false;
      if (!input.current.held[k]) input.current.pressed.add(k);
      input.current.held[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key];
      if (k) input.current.held[k] = false;
    };
    const hide = () => document.hidden && phaseRef.current === "play" && setPhase("paused");
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [start]);

  // toque/mouse na tela do jogo: arrastar move a raquete, deslizar vira direção, tocar = ação
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const toLogical = (e: React.PointerEvent) => {
    const b = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * W, y: ((e.clientY - b.top) / b.height) * H };
  };
  const usesPointer = game.controls === "lr-a" && game.slug !== "asteroides";
  const onDown = (e: React.PointerEvent) => {
    if (phase !== "play") return;
    e.preventDefault();
    const p = toLogical(e);
    Object.assign(input.current.pointer, p, { down: true });
    if (usesPointer && e.pointerType !== "mouse") input.current.pointer.active = true;
    swipe.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onMove = (e: React.PointerEvent) => {
    if (phase !== "play") return;
    const p = toLogical(e);
    Object.assign(input.current.pointer, p);
    if (usesPointer && (e.pointerType === "mouse" || input.current.pointer.down)) input.current.pointer.active = true;
    const s = swipe.current;
    if (s && game.controls === "dpad") {
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.hypot(dx, dy) > 24) {
        input.current.pressed.add(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        swipe.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      }
    }
  };
  const onUp = (e: React.PointerEvent) => {
    input.current.pointer.down = false;
    const s = swipe.current;
    swipe.current = null;
    if (phase !== "play" || !s) return;
    const tap = run.current?.game.tap;
    if (tap && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 12 && performance.now() - s.t < 300) input.current.pressed.add(tap);
  };

  // botões na tela (celular)
  const pad = (k: Key, label: string, cls = "") => (
    <button
      key={k}
      className={"apad " + cls}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        input.current.pointer.active = false;
        if (phaseRef.current === "ready" || phaseRef.current === "over") return start();
        if (phaseRef.current === "paused") return setPhase("play");
        input.current.pressed.add(k);
        input.current.held[k] = true;
        navigator.vibrate?.(8);
      }}
      onPointerUp={() => (input.current.held[k] = false)}
      onPointerCancel={() => (input.current.held[k] = false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
  const arrows = (withUp: boolean, withDown: boolean) => (
    <div className="across">
      {withUp ? pad("up", "▲", "up") : <i />}
      {pad("left", "◀", "left")}
      {pad("right", "▶", "right")}
      {withDown ? pad("down", "▼", "down") : <i />}
    </div>
  );

  const goal = score >= daily.target;
  const need = !loggedName && !nick;
  const keysHint =
    game.controls === "dpad" ? "Setas ou WASD" : game.controls === "a" ? "Espaço, ▲ ou clique" : game.controls === "rot" ? "Setas + Espaço" : "← → + Espaço (ou o mouse)";

  return (
    <div className="wrap arcade" style={{ ["--ga" as string]: palette.a, ["--gb" as string]: palette.b, ["--gc" as string]: palette.c }}>
      <section className="ahero">
        <div className="ahero-txt">
          <span className="bkicker">🕹️ Arcade · ficha nº {daily.number}<span className="nomob"> · jogo do dia</span></span>
          <h1 className="page-title"><span className="aemoji">{game.emoji}</span> {game.name}</h1>
          <p className="lead">{game.how}</p>
          <div className="achips">
            <span>🗺️ Fase <b>{daily.variantName}</b></span>
            <span>⚡ <b>{daily.speedName}</b></span>
            <span>🎨 <b>{palette.name}</b></span>
          </div>
        </div>
        <div className="agoal">
          <small>META DO DIA</small>
          <b>{daily.target.toLocaleString("pt-BR")}</b>
          <small>pontos</small>
        </div>
      </section>

      <div className="agrid">
        <div className="arcab">
          <div className="arcab-marquee"><span>{game.emoji}</span>{game.name.toUpperCase()}<span>{game.emoji}</span></div>
          <div className="arcab-bezel">
          <div className="ascore">
            <span>PONTOS <b>{score.toLocaleString("pt-BR")}</b></span>
            {goal && <span className="hitgoal">🏆 META!</span>}
            <span>RECORDE <b>{best.toLocaleString("pt-BR")}</b></span>
          </div>
          <div className="arcab-screen" style={{ background: palette.bg }}>
            <canvas
              ref={canvas}
              width={W * SCALE}
              height={H * SCALE}
              className="acanvas"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onPointerLeave={() => (input.current.pointer.down = false)}
            />
            {phase !== "play" && (
              <div className="aover">
                {phase === "ready" && (
                  <>
                    <b className="blinky">INSIRA A FICHA</b>
                    <button className="btn hot big" onClick={start}>▶ Jogar</button>
                  </>
                )}
                {phase === "paused" && (
                  <>
                    <b>PAUSADO</b>
                    <button className="btn hot big" onClick={() => setPhase("play")}>▶ Continuar</button>
                  </>
                )}
                {phase === "over" && (
                  <>
                    <b>FIM DE JOGO</b>
                    <span className="final">{score.toLocaleString("pt-BR")} pontos</span>
                    {goal ? <span className="okgoal">🏆 Você bateu a meta do dia!</span> : <span>Faltaram {(daily.target - score).toLocaleString("pt-BR")} para a meta</span>}
                    {score > 0 && need && !sent && (
                      <form
                        className="anick"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const n = nickDraft.trim().slice(0, 16);
                          if (!n) return;
                          store.set("arcade:nick", n);
                          setNick(n);
                          submit(score, n);
                        }}
                      >
                        <input value={nickDraft} onChange={(e) => setNickDraft(e.target.value)} maxLength={16} placeholder="Seu apelido" aria-label="Seu apelido" />
                        <button className="btn hot">Salvar</button>
                        {status !== "authenticated" && (
                          <button type="button" className="linkish" onClick={() => signIn("google")}>ou entre com Google</button>
                        )}
                      </form>
                    )}
                    {msg && <small>{msg}</small>}
                    <button className="btn hot big" onClick={start}>↻ Jogar de novo</button>
                  </>
                )}
              </div>
            )}
          </div>
          </div>
          <div className="arcab-deck">
          <div className={"acontrols " + game.controls}>
            {game.controls === "dpad" && arrows(true, true)}
            {game.controls === "lr-a" && <>{arrows(false, false)}{pad("a", "A", "abtn")}</>}
            {game.controls === "rot" && <>{arrows(true, true)}{pad("a", "A", "abtn")}</>}
            {game.controls === "a" && pad("a", "A", "abtn wide")}
          </div>
          <p className="akeys">⌨️ {keysHint}</p>
          </div>
          <div className="arcab-coin"><i /><span>FICHA GRÁTIS</span><i /></div>
        </div>

        <aside className="aside">
          <div className="apanel">
            <h2>🏆 Ranking de hoje</h2>
            {!board || !board.top.length ? (
              <p className="muted">Ninguém jogou ainda. O primeiro lugar é seu!</p>
            ) : (
              <ol className="arank">
                {board.top.map((e, i) => (
                  <li key={i} className={e.me ? "me" : ""}>
                    <span>{["🥇", "🥈", "🥉"][i] ?? `${i + 1}º`}</span>
                    <b>{e.name}</b>
                    <em>{e.score.toLocaleString("pt-BR")}</em>
                  </li>
                ))}
              </ol>
            )}
            {board?.mine && !board.top.some((e) => e.me) && (
              <p className="amine">Você: {board.mine.pos}º lugar · {board.mine.score.toLocaleString("pt-BR")}</p>
            )}
            {board && board.players > 0 && <p className="muted">{board.players} {board.players === 1 ? "pessoa jogou" : "pessoas jogaram"} hoje</p>}
            {loggedName ? <p className="muted">Jogando como <b>{loggedName}</b></p> : nick && (
              <p className="muted">
                Jogando como <b>{nick}</b> ·{" "}
                <button className="linkish" onClick={() => { setNick(""); setNickDraft(""); store.set("arcade:nick", ""); }}>trocar</button>
              </p>
            )}
          </div>
          <div className="apanel">
            <h2>⏳ Próximo jogo em</h2>
            <p className="acount">{left}</p>
            <p className="muted">Todo dia sai um jogo diferente, com fase, cores e meta novas. Igual para todo mundo.</p>
          </div>
          <div className="apanel">
            <h2>📼 Ontem</h2>
            <p>{yesterday.emoji} {yesterday.name}</p>
            {yesterday.champ ? (
              <p className="muted">Campeão: <b>{yesterday.champ.name}</b> com {yesterday.champ.score.toLocaleString("pt-BR")} pontos</p>
            ) : (
              <p className="muted">Ninguém entrou no ranking.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
