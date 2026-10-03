"use client";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CATEGORY_BY_SLUG } from "@/lib/catalog";
import type { Fav } from "@/lib/store";

export default function Favorites() {
  const { status } = useSession();
  const [favs, setFavs] = useState<Fav[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => setFavs(Array.isArray(d) ? d : []))
      .catch(() => setFavs([]));
  }, [status]);

  async function remove(f: Fav) {
    setFavs((l) => l?.filter((x) => x.id !== f.id) ?? null);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, date: f.date, meta: { src: f.src, title: f.title, cat: f.cat } }),
    });
  }

  if (status === "loading") return <div className="empty">Carregando...</div>;
  if (status !== "authenticated")
    return (
      <div className="empty">
        <p>Entre com sua conta Google para guardar e ver seus favoritos.</p>
        <button className="btn hot" onClick={() => signIn("google")}>Entrar com Google</button>
      </div>
    );
  if (!favs) return <div className="empty">Carregando...</div>;
  if (!favs.length)
    return (
      <div className="empty">
        <div className="static" />
        Nenhum favorito ainda. Toque na ☆ de uma imagem para guardar aqui.
      </div>
    );

  return (
    <div className="board">
      {favs.map((f) => (
        <div key={f.id} className="card" style={{ ["--c" as string]: CATEGORY_BY_SLUG[f.cat]?.color }}>
          <Link href={`/p/${f.date}/${f.id}`} className="ph">
            <img src={f.src} alt={f.title} loading="lazy" onError={(e) => ((e.currentTarget.closest(".card") as HTMLElement).style.display = "none")} />
          </Link>
          <h3>{f.title}</h3>
          <div className="meta">
            <span className="tag">{CATEGORY_BY_SLUG[f.cat]?.emoji} {f.date.split("-").reverse().join("/")}</span>
            <button className="mini fav saved" onClick={() => remove(f)} aria-label="Remover dos favoritos" title="Remover">★</button>
          </div>
        </div>
      ))}
    </div>
  );
}
