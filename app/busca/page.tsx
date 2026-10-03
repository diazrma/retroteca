import type { Metadata } from "next";
import Link from "next/link";
import Board from "@/components/Board";
import { cleanQuery, searchKey, searchPins } from "@/lib/sources";

type P = { searchParams: Promise<{ q?: string }> };

const SUGESTOES = ["Pin-up", "Fusca", "Orelhão", "Atari", "Disco de vinil", "Kombi", "Propaganda antiga", "Copacabana", "Walkman", "Bonde", "Fliperama", "Opala", "Máquina de escrever"];

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const q = cleanQuery((await searchParams).q);
  return { title: q ? `Busca: ${q}` : "Pesquisar" };
}

export default async function Busca({ searchParams }: P) {
  const q = cleanQuery((await searchParams).q);
  const pins = q.length >= 2 ? await searchPins(q) : [];

  return (
    <div className="wrap">
      <h1 className="page-title">🔎 {q ? <>Resultados para “{q}”</> : "Pesquisar no baú"}</h1>
      <form action="/busca" className="bigsearch">
        <input name="q" defaultValue={q} placeholder="Fusca, orelhão, Atari, vinil..." aria-label="Pesquisar" autoFocus={!q} />
        <button className="btn hot">Buscar</button>
      </form>
      <div className="chips" style={{ flexWrap: "wrap" }}>
        {SUGESTOES.map((s) => (
          <Link key={s} href={`/busca?q=${encodeURIComponent(s)}`} className={"chip" + (s.toLowerCase() === q.toLowerCase() ? " on" : "")}>
            {s}
          </Link>
        ))}
      </div>
      {q && pins.length === 0 && (
        <div className="empty">
          <div className="static" />
          Nada encontrado para “{q}”. Tente outra palavra, em português ou inglês.
        </div>
      )}
      {pins.length > 0 && <Board key={q} pins={pins} date={searchKey(q)} categories={false} search={q} />}
    </div>
  );
}
