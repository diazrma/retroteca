import Link from "next/link";
import MyBoards from "@/components/MyBoards";
import SafeImg from "@/components/SafeImg";
import { listRecent } from "@/lib/boards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Murais" };

export default async function Murais() {
  const recent = await listRecent(24);
  return (
    <div className="wrap">
      <h1 className="page-title">📌 Murais</h1>
      <p className="lead">Monte seu mural de coisas antigas: junte imagens de qualquer fita ou da pesquisa e compartilhe o link.</p>
      <MyBoards />
      {recent.length > 0 && (
        <>
          <h2 className="sec-title">Murais da comunidade</h2>
          <div className="bgrid">
            {recent.map((b) => (
              <Link key={b.id} href={`/mural/${b.id}`} className="bcard">
                <span className="bcover">
                  {b.pins.slice(0, 4).map((p) => (
                    <SafeImg key={p.id} src={p.src} alt="" loading="lazy" />
                  ))}
                </span>
                <b>{b.title}</b>
                <small>{b.pins.length} imagens · por {b.ownerName.split(" ")[0]}</small>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
