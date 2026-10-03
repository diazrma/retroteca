"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/lib/catalog";
import { hash } from "@/lib/day";
import type { Pin } from "@/lib/sources";
import PinDetail from "./PinDetail";
import TvMode from "./TvMode";
import { useLikes } from "./useLikes";

type Props = { pins: Pin[]; date: string; categories?: boolean; search?: string };

export default function Board({ pins: initial, date, categories = true, search }: Props) {
  const [pins, setPins] = useState(initial);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const pinOf = useCallback((id: string) => pins.find((p) => p.id === id), [pins]);

  async function loadMore() {
    if (!search) return;
    setLoadingMore(true);
    const next = page + 1;
    const res: Pin[] = await fetch(`/api/search?q=${encodeURIComponent(search)}&p=${next}`)
      .then((r) => r.json())
      .catch(() => []);
    setLoadingMore(false);
    setPage(next);
    setPins((cur) => {
      const have = new Set(cur.map((p) => p.id));
      const fresh = res.filter((p) => !have.has(p.id));
      if (!fresh.length || next >= 10) setNoMore(true);
      return [...cur, ...fresh];
    });
  }

  const [cat, setCat] = useState("all");
  const [origem, setOrigem] = useState<"mundo" | "br">("mundo");
  const [open, setOpen] = useState<Pin | null>(null);
  const [tv, setTv] = useState(false);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const ids = useMemo(() => pins.map((p) => p.id), [pins]);
  const { stats, like, save, bumpComments } = useLikes(ids, date, pinOf);

  // ---- organizar: a pessoa arrasta as fotos e a ordem fica salva no aparelho ----
  const orderKey = "retroteca:ordem:" + date;
  const [order, setOrder] = useState<string[] | null>(null);
  const [arrange, setArrange] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(orderKey) ?? "null");
      if (Array.isArray(saved)) setOrder(saved);
    } catch {}
  }, [orderKey]);

  const ordered = useMemo(() => {
    if (!order) return pins;
    const rank = new Map(order.map((id, i) => [id, i]));
    return pins
      .map((p, i) => ({ p, r: rank.get(p.id) ?? order.length + i }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.p);
  }, [pins, order]);

  function persist(ids: string[] | null) {
    try {
      if (ids) localStorage.setItem(orderKey, JSON.stringify(ids));
      else localStorage.removeItem(orderKey);
    } catch {}
  }

  function moveTo(target: string) {
    if (!dragId || target === dragId || target === lastTarget.current) return;
    lastTarget.current = target;
    const ids = ordered.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(target);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setOrder(ids);
    persist(ids);
  }

  useEffect(() => {
    if (!dragId) return;
    // a foto muda de lugar no meio do arraste e o navegador pode perder o "soltar": escuta na janela toda
    const up = () => {
      setDragId(null);
      lastTarget.current = null;
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragId]);

  function onDragMove(e: React.PointerEvent) {
    if (!dragId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-pin]");
    const id = el?.dataset.pin;
    if (id && id !== dragId) moveTo(id);
    else if (!id || id === dragId) lastTarget.current = null;
    // rola a página quando arrasta perto das bordas
    if (e.clientY < 90) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - 90) window.scrollBy(0, 14);
  }

  function endDrag() {
    if (dragId) persist(ordered.map((p) => p.id));
    setDragId(null);
    lastTarget.current = null;
  }

  const pool = origem === "br" ? ordered.filter((p) => p.br) : ordered;
  const visible = pool.filter((p) => !broken.has(p.id) && (cat === "all" || p.cat === cat));
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of pool) c[p.cat] = (c[p.cat] ?? 0) + 1;
    return c;
  }, [pool]);

  const show = useCallback((p: Pin | null) => {
    setOpen(p);
    const url = p ? `/p/${p.key ?? date}/${p.id}` : null;
    if (url) window.history.pushState({ pin: p!.id }, "", url);
  }, [date]);

  const close = useCallback(() => {
    if (window.history.state?.pin) window.history.back();
    else setOpen(null);
  }, []);

  useEffect(() => {
    const pop = () => setOpen(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !tv && close();
    window.addEventListener("popstate", pop);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("keydown", esc);
    };
  }, [close, tv]);

  useEffect(() => {
    // ?cat=games vem dos links do topo e das notificações
    const params = new URL(window.location.href).searchParams;
    const c = params.get("cat");
    if (c && CATEGORY_BY_SLUG[c]) setCat(c);
    let o = params.get("origem");
    try {
      o ??= localStorage.getItem("retroteca:origem");
    } catch {}
    if (o === "br") setOrigem("br");
  }, []);

  useEffect(() => {
    document.body.style.overflow = open || tv ? "hidden" : "";
  }, [open, tv]);

  function pickOrigem(o: "mundo" | "br") {
    setOrigem(o);
    try {
      localStorage.setItem("retroteca:origem", o);
    } catch {}
    const u = new URL(window.location.href);
    if (o === "br") u.searchParams.set("origem", "br");
    else u.searchParams.delete("origem");
    window.history.replaceState(window.history.state, "", u);
  }

  function pickCat(c: string) {
    setCat(c);
    const u = new URL(window.location.href);
    if (c === "all") u.searchParams.delete("cat");
    else u.searchParams.set("cat", c);
    window.history.replaceState(window.history.state, "", u);
  }

  return (
    <>
      <div className="boardhead">
      <div className="origem" role="group" aria-label="Origem das imagens">
        <button className={origem === "mundo" ? "on" : ""} onClick={() => pickOrigem("mundo")}>
          🌎 Mundo todo <small>{pins.length}</small>
        </button>
        <button className={origem === "br" ? "on" : ""} onClick={() => pickOrigem("br")}>
          🇧🇷 Só Brasil <small>{pins.filter((p) => p.br).length}</small>
        </button>
      </div>
        <button className="zap" onClick={() => setTv(true)} disabled={!visible.length}>
          <svg className="zap-tv" viewBox="0 0 48 44" aria-hidden>
            <defs>
              <linearGradient id="zg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff3fa4" />
                <stop offset="0.5" stopColor="#ffd23f" />
                <stop offset="1" stopColor="#2fd6ff" />
              </linearGradient>
            </defs>
            <path d="M17 9L11 1M31 9l6-8" stroke="#cfcfd4" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="2" y="9" width="44" height="31" rx="7" fill="#9a6232" />
            <rect x="6" y="13" width="28" height="23" rx="5" fill="url(#zg)" className="zap-screen" />
            <path d="M8 18h24M8 23h24M8 28h24M8 33h24" stroke="rgba(0,0,0,.18)" strokeWidth="1.4" />
            <circle cx="40" cy="19" r="3" fill="#e8e8e8" />
            <circle cx="40" cy="28" r="3" fill="#e8e8e8" />
            <rect x="9" y="40" width="6" height="3" rx="1" fill="#5a3417" />
            <rect x="33" y="40" width="6" height="3" rx="1" fill="#5a3417" />
          </svg>
          <b>
            <strong>ZAPEAR</strong>
            <small>assistir na TV ▶</small>
          </b>
        </button>
      </div>
      <div className="arrangebar">
        <button className={"btn" + (arrange ? " hot" : "")} onClick={() => setArrange((a) => !a)}>
          {arrange ? "✔ Pronto" : "✋ Organizar fotos"}
        </button>
        {arrange && <span className="hint-arr">Arraste pela alça ⠿ para trocar as fotos de lugar</span>}
        {order && (
          <button
            className="btn"
            onClick={() => {
              setOrder(null);
              persist(null);
            }}
          >
            ↺ Ordem original
          </button>
        )}
      </div>
      {categories && <div className="toolbar">
        <div className="chips">
          <button className={"chip" + (cat === "all" ? " on" : "")} onClick={() => pickCat("all")}>
            ✨ Tudo <small>{pool.length}</small>
          </button>
          {CATEGORIES.filter((c) => counts[c.slug]).map((c) => (
            <button
              key={c.slug}
              className={"chip" + (cat === c.slug ? " on" : "")}
              style={{ ["--c" as string]: c.color }}
              onClick={() => pickCat(c.slug)}
            >
              {c.emoji} {c.name} <small>{counts[c.slug] ?? 0}</small>
            </button>
          ))}
        </div>
      </div>}

      {visible.length === 0 ? (
        <div className="empty">
          <div className="static" />
          {origem === "br" && pins.some((p) => p.br)
            ? "Nada do Brasil nesta categoria hoje. Tente outra ou veja o mundo todo!"
            : "Sinal fora do ar... tente de novo em instantes."}
        </div>
      ) : (
        <div className={"board" + (arrange ? " arranging" : "")}>
          {visible.map((p, i) => {
            const c = CATEGORY_BY_SLUG[p.cat];
            const s = stats[p.id];
            const rot = ((hash(p.id) % 5) - 2) * 0.6;
            return (
              <div
                key={p.id}
                data-pin={p.id}
                className={"card" + (dragId === p.id ? " dragging" : "")}
                style={{ ["--rot" as string]: rot + "deg", ["--c" as string]: c?.color, animationDelay: Math.min(i, 20) * 30 + "ms" }}
              >
                {arrange && (
                  <button
                    className="grip"
                    aria-label="Arrastar para mudar de lugar"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setDragId(p.id);
                    }}
                    onPointerMove={onDragMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    ⠿
                  </button>
                )}
                <button className="ph" onClick={() => !arrange && show(p)} aria-label={p.title}>
                  <img
                    src={p.src}
                    alt={p.title}
                    loading={i < 8 ? "eager" : "lazy"}
                    width={p.w}
                    height={p.h}
                    onError={() => setBroken((b) => new Set(b).add(p.id))}
                  />
                </button>
                <h3>{p.title}</h3>
                <div className="meta">
                  <span className="tag">{c?.emoji} {p.theme}</span>
                  <button className={"mini" + (s?.liked ? " liked" : "")} onClick={() => like(p.id)} aria-label="Curtir">
                    <span className="heart">{s?.liked ? "♥" : "♡"}</span> {s?.likes ?? 0}
                  </button>
                  <button className="mini" onClick={() => show(p)} aria-label="Comentários">💬 {s?.comments ?? 0}</button>
                  <button className={"mini fav" + (s?.saved ? " saved" : "")} onClick={() => save(p.id)} aria-label={s?.saved ? "Remover dos favoritos" : "Favoritar"} title="Favoritar">
                    {s?.saved ? "★" : "☆"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {search && visible.length > 0 && !noMore && (
        <div style={{ textAlign: "center", padding: "0 0 60px" }}>
          <button className="btn hot" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Rebobinando..." : "📼 Carregar mais"}
          </button>
        </div>
      )}

      {tv && (
        <TvMode
          pins={visible}
          saved={(id) => Boolean(stats[id]?.saved)}
          onSave={save}
          onClose={() => setTv(false)}
          onOpen={(p) => {
            setTv(false);
            show(p);
          }}
        />
      )}

      {open && (
        <div className="overlay" onClick={close}>
          <PinDetail
            pin={open}
            date={date}
            stat={stats[open.id]}
            onLike={() => like(open.id)}
            onSave={() => save(open.id)}
            onComment={() => bumpComments(open.id)}
            onClose={close}
          />
        </div>
      )}
    </>
  );
}
