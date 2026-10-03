"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CATEGORY_BY_SLUG } from "@/lib/catalog";
import type { Pin } from "@/lib/sources";
import type { Comment } from "@/lib/store";
import BoardPicker from "./BoardPicker";
import ShareButtons from "./ShareButtons";
import { pinBody } from "./useLikes";

type Props = {
  pin: Pin;
  date: string;
  stat?: { likes: number; comments: number; liked: boolean; saved: boolean };
  onLike: () => void;
  onSave: () => void;
  onComment?: () => void;
  onClose?: () => void;
  page?: boolean;
};

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(t).toLocaleDateString("pt-BR");
}

export default function PinDetail({ pin, date, stat, onLike, onSave, onComment, onClose, page }: Props) {
  const { status } = useSession();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [src, setSrc] = useState(pin.full);
  const [picker, setPicker] = useState(false);
  const cat = CATEGORY_BY_SLUG[pin.cat];
  const key = pin.key ?? date;

  useEffect(() => {
    fetch("/api/comments?id=" + pin.id)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => setComments([]));
  }, [pin.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "authenticated") return signIn("google");
    setSending(true);
    setErr("");
    const r = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pinBody(pin.id, date, pin), text }),
    });
    const data = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) return setErr(data.error ?? "Não deu certo, tente de novo.");
    setComments((c) => [data, ...(c ?? [])]);
    setText("");
    onComment?.();
  }

  return (
    <article className={"detail" + (page ? " page" : "")} onClick={(e) => e.stopPropagation()}>
      {onClose && (
        <button className="close" onClick={onClose} aria-label="Fechar">✕</button>
      )}
      <div className="big">
        <img src={src} alt={pin.title} onError={() => src !== pin.src && setSrc(pin.src)} />
        {picker && <BoardPicker pin={pin} date={date} onClose={() => setPicker(false)} />}
      </div>
      <div className="side">
        <span className="tag" style={{ color: "#6a5e80" }}>
          {cat?.emoji} {cat?.name} · {pin.theme}
        </span>
        <h2>{pin.title}</h2>
        <div className="actions">
          <button className={"pbtn" + (stat?.liked ? " liked" : "")} onClick={onLike}>
            <span className="heart">{stat?.liked ? "♥" : "♡"}</span> {stat?.likes ?? 0} curtida{stat?.likes === 1 ? "" : "s"}
          </button>
          <button className={"pbtn" + (stat?.saved ? " saved" : "")} onClick={onSave}>
            {stat?.saved ? "★ Favoritado" : "☆ Favoritar"}
          </button>
          <button className="pbtn mural" onClick={() => setPicker(true)}>📌 Mural</button>
          <a className="pbtn" href={pin.source} target="_blank" rel="noopener noreferrer">Ver fonte ↗</a>
        </div>
        <div className="curator">
          <b>📼 Nota do curador-robô</b>
          {pin.caption}
        </div>
        <ShareButtons url={`/p/${key}/${pin.id}`} title={pin.title} image={pin.full} />
        <p className="credit">
          Foto: {pin.creator} · Licença:{" "}
          {pin.licenseUrl ? <a href={pin.licenseUrl} target="_blank" rel="noopener noreferrer">{pin.license}</a> : pin.license}{" "}
          · via {pin.provider}
          {pin.original && <><br />Título original: “{pin.original}”</>}
        </p>
        <section className="comments">
          <h4>Comentários {comments ? `(${comments.length})` : ""}</h4>
          <form className="cform" onSubmit={send}>
            <textarea
              value={text}
              maxLength={280}
              onChange={(e) => setText(e.target.value)}
              placeholder={status === "authenticated" ? "Conta aí sua lembrança..." : "Entre com Google para comentar"}
              onFocus={() => status === "unauthenticated" && signIn("google")}
            />
            <button className="pbtn" disabled={sending || (status === "authenticated" && text.trim().length < 2)}>
              {sending ? "..." : "Enviar"}
            </button>
          </form>
          {err && <p className="err">{err}</p>}
          <ul className="clist">
            {comments?.map((c) => (
              <li key={c.id}>
                {c.avatar ? (
                  <img src={c.avatar} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="ini">{c.name[0]}</span>
                )}
                <div>
                  <b>{c.name}</b>
                  <time>{ago(c.at)}</time>
                  <p>{c.text}</p>
                </div>
              </li>
            ))}
            {comments?.length === 0 && <li className="hint">Ninguém comentou ainda. Seja o primeiro!</li>}
          </ul>
        </section>
      </div>
    </article>
  );
}
