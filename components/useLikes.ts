"use client";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { Stats } from "@/lib/store";

/** Estado de curtidas/comentários de um conjunto de imagens. */
type PinLike = { key?: string; src: string; title: string; cat: string };

/** Corpo enviado ao servidor: chave da imagem + dados mínimos (para quando a fonte estiver fora do ar). */
export function pinBody(id: string, date: string, p?: PinLike) {
  return { id, date: p?.key ?? date, meta: p ? { src: p.src, title: p.title, cat: p.cat } : undefined };
}

export function useLikes(ids: string[], date: string, pinOf?: (id: string) => PinLike | undefined) {
  const { status } = useSession();
  const [stats, setStats] = useState<Stats>({});
  const key = ids.join(",");

  useEffect(() => {
    if (!key || status === "loading") return;
    fetch("/api/stats?ids=" + encodeURIComponent(key))
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [key, status]);

  const like = useCallback(
    async (id: string) => {
      if (status !== "authenticated") return signIn("google");
      setStats((s) => {
        const cur = s[id] ?? { likes: 0, comments: 0, liked: false, saved: false };
        return { ...s, [id]: { ...cur, liked: !cur.liked, likes: cur.likes + (cur.liked ? -1 : 1) } };
      });
      const r = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pinBody(id, date, pinOf?.(id))),
      });
      if (r.ok) {
        const { liked, likes } = await r.json();
        setStats((s) => ({ ...s, [id]: { ...(s[id] ?? { comments: 0, saved: false }), liked, likes } }));
      }
    },
    [status, date, pinOf],
  );

  const save = useCallback(
    async (id: string) => {
      if (status !== "authenticated") return signIn("google");
      const blank = { likes: 0, comments: 0, liked: false, saved: false };
      setStats((s) => ({ ...s, [id]: { ...(s[id] ?? blank), saved: !(s[id]?.saved ?? false) } }));
      const r = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pinBody(id, date, pinOf?.(id))),
      });
      if (r.ok) {
        const { saved } = await r.json();
        setStats((s) => ({ ...s, [id]: { ...(s[id] ?? blank), saved } }));
      }
    },
    [status, date, pinOf],
  );

  const bumpComments = useCallback((id: string) => {
    setStats((s) => {
      const cur = s[id] ?? { likes: 0, comments: 0, liked: false, saved: false };
      return { ...s, [id]: { ...cur, comments: cur.comments + 1 } };
    });
  }, []);

  return { stats, like, save, bumpComments };
}
