import Link from "next/link";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/lib/catalog";
import { dayNote } from "@/lib/caption";
import { addDays, formatDay, LAUNCH, tapeNumber, today } from "@/lib/day";
import type { Day } from "@/lib/sources";
import Board from "./Board";

export default function DayView({ day }: { day: Day }) {
  const isToday = day.date === today();
  const prev = day.date > LAUNCH ? addDays(day.date, -1) : null;
  const next = !isToday ? addDays(day.date, 1) : null;
  const dayHref = (d: string) => (d === today() ? "/" : `/dia/${d}`);

  return (
    <div className="wrap">
      <section className="hero">
        <div className="tape">
          <div className="tape-head">
            <span className="rec"><i /> {isToday ? "AO VIVO" : "REPRISE"}</span>
            <span className="date">Fita nº {String(tapeNumber(day.date)).padStart(3, "0")} · {formatDay(day.date)}</span>
            <span className="dial">
              {prev && <Link className="btn" href={dayHref(prev)}>◀◀ Rebobinar</Link>}
              {next && <Link className="btn" href={dayHref(next)}>Avançar ▶▶</Link>}
            </span>
          </div>
          <h1>{isToday ? "A fita de hoje" : "Fita de " + formatDay(day.date).split(",")[1]}</h1>
          <p className="note">
            {dayNote(day.date)} {day.pins.length} imagens retrô em {CATEGORIES.length} categorias. Curta, comente, compartilhe — amanhã
            tem fita nova.
          </p>
          <div className="themes">
            {day.themes.map((t) => {
              const c = CATEGORY_BY_SLUG[t.cat];
              return (
                <a key={t.cat} className="theme" href={`?cat=${t.cat}`} style={{ ["--c" as string]: c.color }}>
                  <b>{c.emoji} {t.theme}</b>
                  <span>{t.intro}</span>
                  {t.discovered && <em className="disc">✨ Descoberta do dia: {t.discovered}</em>}
                </a>
              );
            })}
          </div>
        </div>
      </section>
      <Board pins={day.pins} date={day.date} />
    </div>
  );
}
