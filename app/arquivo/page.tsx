import Link from "next/link";
import { CATEGORY_BY_SLUG } from "@/lib/catalog";
import { formatDay, listDays, tapeNumber, today } from "@/lib/day";
import { themesFor } from "@/lib/sources";

export const revalidate = 3600;
export const metadata = { title: "Arquivo de fitas" };

export default function Arquivo() {
  const days = listDays();
  return (
    <div className="wrap">
      <h1 className="page-title">Arquivo de fitas</h1>
      <p className="lead">Toda fita fica guardada na prateleira. Escolha um dia e rebobine.</p>
      <div className="archive">
        {days.map((d) => (
          <Link key={d} className="vhs" href={d === today() ? "/" : `/dia/${d}`}>
            <div className="label">
              <b>FITA Nº {String(tapeNumber(d)).padStart(3, "0")}</b>
              <small>{formatDay(d)}</small>
              <ul>
                {themesFor(d).map((t) => (
                  <li key={t.cat.slug}>{CATEGORY_BY_SLUG[t.cat.slug].emoji} {t.theme.title}</li>
                ))}
              </ul>
            </div>
            <div className="reels"><i /><i /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
