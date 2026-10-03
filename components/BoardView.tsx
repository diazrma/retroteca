"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_BY_SLUG } from "@/lib/catalog";
import type { PublicBoard } from "@/lib/boards";
import ShareButtons from "./ShareButtons";

/** Página pública de um mural. O dono pode editar, reorganizar (arrastando) e remover imagens. */
export default function BoardView({ initial }: { initial: PublicBoard }) {
  const [b, setB] = useState(initial);
  const [edit, setEdit] = useState(false);
  const [arrange, setArrange] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [title, setTitle] = useState(b.title);
  const [desc, setDesc] = useState(b.desc);
  const pinsRef = useRef(b.pins);
  const moved = useRef(false);
  const press = useRef<{ id: string; x: number; y: number; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const router = useRouter();
  pinsRef.current = b.pins;

  async function patch(body: object) {
    const r = await fetch(`/api/boards/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) setB(await r.json());
    return r.ok;
  }

  async function saveOrder() {
    setSave("saving");
    setSave((await patch({ order: pinsRef.current.map((p) => p.id) })) ? "saved" : "error");
  }

  async function remove(pinId: string) {
    setB((x) => ({ ...x, pins: x.pins.filter((p) => p.id !== pinId) }));
    await fetch(`/api/boards/${b.id}/pins`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pinId }),
    });
  }

  async function destroy() {
    if (!confirm(`Apagar o mural “${b.title}”? Isso não tem volta.`)) return;
    await fetch(`/api/boards/${b.id}`, { method: "DELETE" });
    router.push("/murais");
  }

  /** Move a foto `id` para a posição `to` (índice). */
  function moveTo(id: string, to: number) {
    const pins = [...pinsRef.current];
    const from = pins.findIndex((p) => p.id === id);
    if (from < 0 || to < 0 || to >= pins.length || from === to) return false;
    const [m] = pins.splice(from, 1);
    pins.splice(to, 0, m);
    pinsRef.current = pins;
    setB((x) => ({ ...x, pins }));
    return true;
  }

  function step(id: string, dir: -1 | 1) {
    const i = pinsRef.current.findIndex((p) => p.id === id);
    if (moveTo(id, i + dir)) saveOrder();
  }

  function startPress(e: React.PointerEvent, id: string) {
    if (!arrange || e.button !== 0) return;
    if (e.pointerType === "mouse") {
      e.preventDefault();
      setDragId(id);
      return;
    }
    // no toque: segurar ~1/4 s para pegar a foto; arrastar antes disso rola a página normalmente
    press.current = { id, x: e.clientX, y: e.clientY, timer: setTimeout(() => {
      navigator.vibrate?.(12);
      setDragId(id);
    }, 260) };
  }

  function cancelPress(e?: React.PointerEvent) {
    const p = press.current;
    if (!p) return;
    if (e && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
    clearTimeout(p.timer);
    press.current = null;
  }

  useEffect(() => {
    if (!dragId) return;
    moved.current = false;
    let scroll = 0;
    let raf = 0;
    const tick = () => {
      if (scroll) window.scrollBy(0, scroll);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-pin]");
      const target = el?.dataset.pin;
      if (target && target !== dragId) {
        const to = pinsRef.current.findIndex((p) => p.id === target);
        if (moveTo(dragId, to)) moved.current = true;
      }
      const edge = 90;
      scroll = e.clientY < edge ? -Math.ceil((edge - e.clientY) / 6) : e.clientY > window.innerHeight - edge ? Math.ceil((e.clientY - window.innerHeight + edge) / 6) : 0;
    };
    const blockTouch = (e: TouchEvent) => e.preventDefault();
    const up = () => {
      press.current = null;
      setDragId(null);
      if (moved.current) saveOrder();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("touchmove", blockTouch, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("touchmove", blockTouch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  return (
    <div className="wrap">
      <section className="bhead">
        {edit ? (
          <form
            className="bedit"
            onSubmit={(e) => {
              e.preventDefault();
              patch({ title, desc });
              setEdit(false);
            }}
          >
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
            <textarea value={desc} maxLength={240} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" />
            <div className="row">
              <button className="btn hot">Salvar</button>
              <button type="button" className="btn" onClick={() => setEdit(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <>
            <span className="bkicker">📌 Mural</span>
            <h1 className="page-title">{b.title}</h1>
            {b.desc && <p className="lead">{b.desc}</p>}
            <p className="bby">
              {b.ownerImage && <img src={b.ownerImage} alt="" referrerPolicy="no-referrer" />}
              por <b>{b.ownerName}</b> · {b.pins.length} imagens
            </p>
          </>
        )}
        <ShareButtons url={`/mural/${b.id}`} title={`Mural “${b.title}”`} image={b.pins[0]?.src} />
        {b.mine && !edit && (
          <div className="bowner">
            <button className={"btn" + (arrange ? " hot" : "")} onClick={() => { setArrange((a) => !a); setSave("idle"); }}>
              {arrange ? "✔ Pronto" : "✋ Organizar fotos"}
            </button>
            {!arrange && <button className="btn" onClick={() => setEdit(true)}>✏️ Editar</button>}
            {!arrange && <button className="btn danger" onClick={destroy}>🗑 Apagar</button>}
          </div>
        )}
        {arrange && (
          <p className="arrhint">
            <span>Arraste as fotos para trocar de lugar <small>(no celular, segure a foto antes de arrastar)</small> ou use ◀ ▶.</span>
            {save !== "idle" && (
              <em className={"arrsave " + save}>
                {save === "saving" ? "Salvando…" : save === "saved" ? "✔ Ordem salva" : "Não deu para salvar. Tente de novo."}
              </em>
            )}
          </p>
        )}
      </section>

      {b.pins.length === 0 ? (
        <div className="empty">
          <div className="static" />
          {b.mine ? (
            <>Mural vazio. Abra qualquer imagem e toque em <b>📌 Mural</b> para adicionar. <Link href="/">Ir para a fita de hoje →</Link></>
          ) : (
            "Este mural ainda não tem imagens."
          )}
        </div>
      ) : (
        <div className={"board bboard" + (arrange ? " arranging" : "")}>
          {b.pins.map((p, i) => (
            <div
              key={p.id}
              data-pin={p.id}
              className={"card" + (dragId === p.id ? " dragging" : "")}
              style={{ ["--c" as string]: CATEGORY_BY_SLUG[p.cat]?.color }}
              onPointerDown={(e) => startPress(e, p.id)}
              onPointerMove={cancelPress}
              onPointerUp={() => cancelPress()}
              onPointerCancel={() => cancelPress()}
              onContextMenu={(e) => arrange && e.preventDefault()}
            >
              {arrange && (
                <button className="unpin" onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(p.id)} aria-label="Remover do mural">✕</button>
              )}
              <Link href={arrange ? "#" : `/p/${p.date}/${p.id}`} className="ph" draggable={false} onClick={(e) => arrange && e.preventDefault()}>
                <img
                  src={p.src}
                  alt={p.title}
                  loading="lazy"
                  draggable={false}
                  onError={(e) => ((e.currentTarget.closest(".card") as HTMLElement).style.display = "none")}
                />
              </Link>
              {arrange ? (
                <div className="arrbar" onPointerDown={(e) => e.stopPropagation()}>
                  <button onClick={() => step(p.id, -1)} disabled={i === 0} aria-label="Mover para antes">◀</button>
                  <b>{i + 1}</b>
                  <button onClick={() => step(p.id, 1)} disabled={i === b.pins.length - 1} aria-label="Mover para depois">▶</button>
                </div>
              ) : (
                <h3>{p.title}</h3>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
