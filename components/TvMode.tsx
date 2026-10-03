"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORY_BY_SLUG } from "@/lib/catalog";
import type { Pin } from "@/lib/sources";

const AUTO_MS = 5000;

type Props = {
  pins: Pin[];
  onClose: () => void;
  onOpen: (p: Pin) => void;
  saved: (id: string) => boolean;
  onSave: (id: string) => void;
};

export default function TvMode({ pins, onClose, onOpen, saved, onSave }: Props) {
  const [i, setI] = useState(0);
  const [noise, setNoise] = useState(true);
  const [auto, setAuto] = useState(true);
  const touch = useRef<number | null>(null);

  const zap = useCallback(
    (d: number) => {
      setNoise(true);
      setI((x) => (x + d + pins.length) % pins.length);
    },
    [pins.length],
  );
  const manual = (d: number) => {
    setAuto(false);
    zap(d);
  };

  useEffect(() => {
    if (!noise) return;
    const t = setTimeout(() => setNoise(false), 380);
    return () => clearTimeout(t);
  }, [noise, i]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => zap(1), AUTO_MS);
    return () => clearInterval(t);
  }, [auto, zap]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowUp") manual(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") manual(-1);
      if (e.key === " ") {
        e.preventDefault();
        setAuto((a) => !a);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zap, onClose]);

  const p = pins[i];
  if (!p) return null;
  const cat = CATEGORY_BY_SLUG[p.cat];
  const ch = String(i + 1).padStart(2, "0");

  return (
    <div className="tvroom" onClick={onClose}>
      <div className="tvset" onClick={(e) => e.stopPropagation()}>
        <div className="antenna" aria-hidden><i /><i /><b /></div>
        <div className="cabinet">
          <div
            className="bezel"
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touch.current === null) return;
              const dx = e.changedTouches[0].clientX - touch.current;
              touch.current = null;
              if (Math.abs(dx) > 40) manual(dx < 0 ? 1 : -1);
            }}
          >
            <button className="crt" onClick={() => onOpen(p)} aria-label={"Ver detalhes: " + p.title}>
              <img key={p.id} src={p.src} alt={p.title} />
              {noise && <span className="static" />}
              <span className="glare" />
              <span className="osd-ch">CH {ch}</span>
              {auto && <span key={"bar" + i} className="autobar" style={{ animationDuration: AUTO_MS + "ms" }} />}
            </button>
          </div>
          <div className="panel">
            <div className="brand">RETROTECA</div>
            <button className="tvknob" onClick={() => manual(1)} aria-label="Próximo canal" style={{ transform: `rotate(${i * 30}deg)` }}>
              <span />
            </button>
            <small>CANAL</small>
            <div className="speaker" aria-hidden />
            <div className="power">
              <span className={"led" + (auto ? " on" : "")} />
              <button onClick={onClose} aria-label="Desligar">
                <svg viewBox="0 0 24 24"><path d="M12 3v9" strokeLinecap="round" /><path d="M6.3 6.8a8 8 0 1 0 11.4 0" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        </div>
        <div className="feet" aria-hidden><i /><i /></div>
      </div>

      <button className="tvclose" onClick={onClose} aria-label="Fechar">
        <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
      </button>

      <div className="remote" onClick={(e) => e.stopPropagation()}>
        <div className="now">
          <span className="now-cat" style={{ background: cat?.color }}>{cat?.emoji} {p.theme}</span>
          <b>{p.title}</b>
        </div>
        <div className="rbtns">
          <button className="rbtn" onClick={() => manual(-1)} aria-label="Canal anterior">
            <svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9.5 12z" /></svg>
          </button>
          <button className="rbtn play" onClick={() => setAuto((a) => !a)} aria-label={auto ? "Pausar" : "Automático"}>
            {auto ? (
              <svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button className="rbtn" onClick={() => manual(1)} aria-label="Próximo canal">
            <svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l10.5-7z" /></svg>
          </button>
          <button
            className={"rbtn star" + (saved(p.id) ? " on" : "")}
            onClick={() => onSave(p.id)}
            aria-label={saved(p.id) ? "Remover dos favoritos" : "Favoritar"}
          >
            <svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" /></svg>
          </button>
          <button className="likebtn" onClick={() => onOpen(p)}>
            <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" /></svg>
            Curtir e comentar
          </button>
        </div>
        <p className="tvhint">Setas ou deslize para trocar de canal · Espaço pausa · Esc fecha</p>
      </div>
    </div>
  );
}
