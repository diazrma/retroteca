"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Hoje" },
  { href: "/arquivo", label: "Arquivo" },
  { href: "/top", label: "Mais curtidas" },
  { href: "/arcade", label: "🕹️ Arcade" },
  { href: "/murais", label: "📌 Murais" },
  { href: "/favoritos", label: "⭐ Favoritos" },
  { href: "/alertas", label: "🔔 Alertas" },
];

// barra de abas do celular: os principais ficam sempre à mão, o resto vai no "Mais"
const TABS = [
  { href: "/", icon: "📼", label: "Hoje" },
  { href: "/arquivo", icon: "🗂️", label: "Arquivo" },
  { href: "/arcade", icon: "🕹️", label: "Arcade" },
  { href: "/murais", icon: "📌", label: "Murais" },
];
const MORE = [
  { href: "/top", icon: "🔥", label: "Mais curtidas" },
  { href: "/favoritos", icon: "⭐", label: "Favoritos" },
  { href: "/alertas", icon: "🔔", label: "Alertas" },
];

export default function Header() {
  const path = usePathname();
  const { data, status } = useSession();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  const isOn = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace(/s$/, "")));
  return (
    <>
    <header className="top">
      <div className="wrap">
        <Link href="/" className="logo">RETROTECA</Link>
        <form action="/busca" className="hsearch" role="search">
          <input name="q" placeholder="Pesquisar no baú..." aria-label="Pesquisar" />
          <button aria-label="Buscar">
            <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
          </button>
        </form>
        <nav className="nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? "on" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="auth">
          {status === "authenticated" ? (
            <span className="user">
              {data.user?.image && <img className="avatar" src={data.user.image} alt="" referrerPolicy="no-referrer" />}
              <span className="user-name">{data.user?.name?.split(" ")[0]}</span>
              <button className="btn" onClick={() => signOut()}>Sair</button>
            </span>
          ) : (
            <button className="btn hot" onClick={() => signIn("google")} disabled={status === "loading"}>
              Entrar com Google
            </button>
          )}
        </div>
      </div>
    </header>

    <nav className="tabbar" aria-label="Menu">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={isOn(t.href) ? "on" : ""}>
          <i>{t.icon}</i>
          <span>{t.label}</span>
        </Link>
      ))}
      <button className={more || MORE.some((m) => isOn(m.href)) ? "on" : ""} onClick={() => setMore((m) => !m)} aria-expanded={more}>
        <i>☰</i>
        <span>Mais</span>
      </button>
    </nav>

    {more && (
      <div className="moresheet-bg" onClick={() => setMore(false)}>
        <div className="moresheet" onClick={(e) => e.stopPropagation()}>
          {MORE.map((m) => (
            <Link key={m.href} href={m.href} className={isOn(m.href) ? "on" : ""} onClick={() => setMore(false)}>
              <i>{m.icon}</i>
              {m.label}
            </Link>
          ))}
          {status === "authenticated" ? (
            <button onClick={() => signOut()}>
              <i>🚪</i>
              Sair ({data.user?.name?.split(" ")[0]})
            </button>
          ) : (
            <button className="hot" onClick={() => signIn("google")}>
              <i>🔑</i>
              Entrar com Google
            </button>
          )}
        </div>
      </div>
    )}
    </>
  );
}
