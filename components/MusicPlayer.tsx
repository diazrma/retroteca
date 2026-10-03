"use client";
import { useEffect, useRef, useState } from "react";

const KEY = "retroteca:musica";

/** Toca-fitas flutuante: a trilha começa no primeiro toque na página e pode ser pausada. */
export default function MusicPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio("/trilha.mp3");
    a.loop = true;
    a.volume = 0.35;
    audio.current = a;
    a.addEventListener("play", () => setPlaying(true));
    a.addEventListener("pause", () => setPlaying(false));

    let off = false;
    try {
      off = localStorage.getItem(KEY) === "off";
    } catch {}
    // navegadores só deixam tocar som depois de um toque/clique da pessoa
    const start = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.(".tape-player")) return;
      a.play().catch(() => {});
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    if (!off) {
      window.addEventListener("pointerdown", start);
      window.addEventListener("keydown", start);
    }
    return () => {
      cleanup();
      a.pause();
    };
  }, []);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
      try { localStorage.setItem(KEY, "on"); } catch {}
    } else {
      a.pause();
      try { localStorage.setItem(KEY, "off"); } catch {}
    }
  }

  return (
    <button className={"tape-player" + (playing ? " on" : "")} onClick={toggle} aria-label={playing ? "Pausar música" : "Tocar música"}>
      <span className="reels" aria-hidden><i /><i /></span>
      <span className="tp-label">
        {playing ? "❚❚" : "▶"}
        <span className="tp-text">{playing ? " Pausar trilha" : " Tocar trilha"}</span>
      </span>
    </button>
  );
}
