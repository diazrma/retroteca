"use client";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { PublicBoard } from "@/lib/boards";
import type { Pin } from "@/lib/sources";
import { pinBody } from "./useLikes";

type Props = { pin: Pin; date: string; onClose: () => void };

/** Escolher (ou criar) o mural onde salvar uma imagem. No celular abre como gaveta de baixo. */
export default function BoardPicker({ pin, date, onClose }: Props) {
  const pinId = pin.id;
  const { status } = useSession();
  const [boards, setBoards] = useState<PublicBoard[] | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => setBoards(Array.isArray(d) ? d : []))
      .catch(() => setBoards([]));
  }, [status]);

  async function toggle(b: PublicBoard) {
    setBusy(b.id);
    const has = b.pins.some((p) => p.id === pinId);
    const r = await fetch(`/api/boards/${b.id}/pins`, {
      method: has ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pinBody(pin.id, date, pin)),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setMsg(d.error ?? "Não deu certo.");
    setBoards((l) => l?.map((x) => (x.id === b.id ? d : x)) ?? null);
    setMsg(has ? `Removido de “${b.title}”` : `Salvo em “${b.title}” 📌`);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy("new");
    const r = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, pin: pinBody(pin.id, date, pin) }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setMsg(d.error ?? "Não deu certo.");
    setBoards((l) => [d, ...(l ?? [])]);
    setTitle("");
    setMsg(`Mural “${d.title}” criado com a imagem 📌`);
  }

  return (
    <div className="sheet-bg" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Salvar em mural">
        <div className="sheet-grab" />
        <div className="sheet-head">
          <b>📌 Salvar em mural</b>
          <button onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        {status !== "authenticated" ? (
          <div className="sheet-body">
            <p>Entre com Google para criar murais e guardar suas imagens.</p>
            <button className="btn hot" onClick={() => signIn("google")}>Entrar com Google</button>
          </div>
        ) : (
          <div className="sheet-body">
            <form className="newboard" onSubmit={create}>
              <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Novo mural: ex. Garagem do vovô" />
              <button className="btn hot" disabled={busy === "new" || !title.trim()}>Criar</button>
            </form>
            {!boards && <p className="hint">Carregando seus murais...</p>}
            {boards?.length === 0 && <p className="hint">Você ainda não tem murais. Crie o primeiro aí em cima!</p>}
            <ul className="blist">
              {boards?.map((b) => {
                const has = b.pins.some((p) => p.id === pinId);
                return (
                  <li key={b.id}>
                    <button onClick={() => toggle(b)} disabled={busy === b.id} className={has ? "in" : ""}>
                      <span className="bthumb">{b.pins[0] ? <img src={b.pins[0].src} alt="" /> : "📼"}</span>
                      <span className="bname">
                        {b.title}
                        <small>{b.pins.length} imagens</small>
                      </span>
                      <span className="bcheck">{has ? "✔ Salvo" : "Salvar"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {msg && <p className="okmsg">{msg} <Link href="/murais">Ver meus murais →</Link></p>}
          </div>
        )}
      </div>
    </div>
  );
}
