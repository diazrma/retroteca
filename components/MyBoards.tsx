"use client";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicBoard } from "@/lib/boards";

export default function MyBoards() {
  const { status } = useSession();
  const router = useRouter();
  const [boards, setBoards] = useState<PublicBoard[] | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => setBoards(Array.isArray(d) ? d : []))
      .catch(() => setBoards([]));
  }, [status]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, desc }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(d.error ?? "Não deu certo.");
    router.push(`/mural/${d.id}`);
  }

  if (status === "loading") return <p className="hint">Carregando...</p>;
  if (status !== "authenticated")
    return (
      <div className="box">
        <p style={{ marginTop: 0 }}>Entre com Google para criar seus murais.</p>
        <button className="btn hot" onClick={() => signIn("google")}>Entrar com Google</button>
      </div>
    );

  return (
    <>
      <form className="box createboard" onSubmit={create}>
        <b>＋ Novo mural</b>
        <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Nome (ex.: Anos 80 lá em casa)" required />
        <input value={desc} maxLength={240} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (opcional)" />
        <button className="btn hot">Criar mural</button>
        {err && <p className="err">{err}</p>}
      </form>
      <h2 className="sec-title">Meus murais</h2>
      {!boards ? (
        <p className="hint">Carregando...</p>
      ) : boards.length === 0 ? (
        <p className="hint">
          Nenhum mural ainda. Crie um aqui ou toque em <b>📌 Mural</b> em qualquer imagem.
        </p>
      ) : (
        <div className="bgrid">
          {boards.map((b) => (
            <Link key={b.id} href={`/mural/${b.id}`} className="bcard">
              <span className="bcover">
                {b.pins.length ? b.pins.slice(0, 4).map((p) => <img key={p.id} src={p.src} alt="" loading="lazy" />) : <em>📼</em>}
              </span>
              <b>{b.title}</b>
              <small>{b.pins.length} imagens</small>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
