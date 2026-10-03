"use client";
import { useState } from "react";

type Props = { url: string; title: string; image?: string };

export default function ShareButtons({ url, title, image }: Props) {
  const [toast, setToast] = useState("");
  const full = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
  const text = `${title} — achei na Retroteca 📼`;
  const e = encodeURIComponent;

  const links = [
    { name: "WhatsApp", bg: "#25D366", href: `https://wa.me/?text=${e(text + " " + full)}` },
    { name: "X", bg: "#111", href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(full)}` },
    { name: "Facebook", bg: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${e(full)}` },
    {
      name: "Pinterest",
      bg: "#E60023",
      href: `https://pinterest.com/pin/create/button/?url=${e(full)}&description=${e(text)}${image ? "&media=" + e(image) : ""}`,
    },
    { name: "Telegram", bg: "#229ED9", href: `https://t.me/share/url?url=${e(full)}&text=${e(text)}` },
  ];

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };

  async function native() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Retroteca", text, url: full });
      } catch {}
    } else {
      await navigator.clipboard.writeText(full);
      flash("Link copiado! 📋");
    }
  }

  return (
    <div className="share">
      <button style={{ background: "#2a2236" }} onClick={native}>📤 Compartilhar</button>
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" style={{ background: l.bg }}>
          {l.name}
        </a>
      ))}
      <button
        style={{ background: "#6a5e80" }}
        onClick={async () => {
          await navigator.clipboard.writeText(full);
          flash("Link copiado! 📋");
        }}
      >
        Copiar link
      </button>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
