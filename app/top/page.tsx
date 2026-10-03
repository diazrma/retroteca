import Link from "next/link";
import { CATEGORY_BY_SLUG } from "@/lib/catalog";
import SafeImg from "@/components/SafeImg";
import { topPins } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mais curtidas" };

export default async function Top() {
  const pins = await topPins(60);
  return (
    <div className="wrap">
      <h1 className="page-title">Paradas de sucesso</h1>
      <p className="lead">As imagens mais curtidas de todas as fitas. Quem decide é você.</p>
      {pins.length === 0 ? (
        <div className="empty"><div className="static" />Nenhuma curtida ainda. Vá até a fita de hoje e dê o primeiro ♥</div>
      ) : (
        <div className="board">
          {pins.map((p, i) => (
            <Link key={p.id} href={`/p/${p.date}/${p.id}`} className="card" style={{ ["--c" as string]: CATEGORY_BY_SLUG[p.cat]?.color, textDecoration: "none" }}>
              <span className="ph"><SafeImg src={p.src} alt={p.title} loading="lazy" /></span>
              <h3>#{i + 1} {p.title}</h3>
              <div className="meta">
                <span className="tag">{CATEGORY_BY_SLUG[p.cat]?.emoji} {p.date.split("-").reverse().join("/")}</span>
                <span className="mini liked">♥ {p.likes}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
