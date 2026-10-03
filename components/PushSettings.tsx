"use client";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/catalog";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const LS = "retroteca:cats";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export default function PushSettings() {
  const [state, setState] = useState<State>("loading");
  const [cats, setCats] = useState<string[]>(CATEGORIES.map((c) => c.slug));
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS) ?? "null");
      if (Array.isArray(saved)) setCats(saved);
    } catch {}
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, []);

  async function save(sub: PushSubscription, list: string[]) {
    const r = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub: sub.toJSON(), cats: list }),
    });
    if (!r.ok) throw new Error();
  }

  async function enable() {
    setMsg("");
    if (!KEY) return setMsg("Notificações ainda não configuradas no servidor (faltam as chaves VAPID).");
    if (!cats.length) return setMsg("Escolha pelo menos uma categoria.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(KEY) });
    try {
      await save(sub, cats);
      setState("on");
      setMsg("Pronto! Amanhã cedo chega a primeira fita no seu celular. 📼");
    } catch {
      setMsg("Não deu para salvar. Tente de novo.");
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
    setMsg("Notificações desligadas.");
  }

  async function toggle(slug: string) {
    const list = cats.includes(slug) ? cats.filter((c) => c !== slug) : [...cats, slug];
    setCats(list);
    localStorage.setItem(LS, JSON.stringify(list));
    if (state === "on") {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) await save(sub, list).catch(() => {});
      setMsg(list.length ? "Preferências salvas ✔" : "Sem categorias, você não vai receber nada.");
    }
  }

  return (
    <>
      <div className="box">
        <h3 style={{ marginTop: 0 }}>1. Escolha o que você curte</h3>
        <div className="cats">
          {CATEGORIES.map((c) => {
            const on = cats.includes(c.slug);
            return (
              <button key={c.slug} className={"catpick" + (on ? " on" : "")} style={{ ["--c" as string]: c.color }} onClick={() => toggle(c.slug)}>
                <span className="em">{c.emoji}</span>
                <span>{c.name}</span>
                <span className="chk">{on ? "[X]" : "[ ]"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="box">
        <h3 style={{ marginTop: 0 }}>2. Ative no seu celular</h3>
        {state === "loading" && <p>Verificando...</p>}
        {state === "unsupported" && <p>Este navegador não aceita notificações. Tente o Chrome no Android ou o Safari no iPhone.</p>}
        {state === "ios-install" && (
          <p>
            No iPhone: toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra a Retroteca pelo ícone novo e
            volte nesta página para ativar.
          </p>
        )}
        {state === "denied" && <p>As notificações estão bloqueadas. Libere nas configurações do navegador para este site.</p>}
        {state === "off" && <button className="btn hot" onClick={enable}>🔔 Ativar notificações diárias</button>}
        {state === "on" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="btn" style={{ borderColor: "#7cff6b" }}>✔ Ativado</span>
            <button className="btn" onClick={disable}>Desativar</button>
          </div>
        )}
        {msg && <p>{msg}</p>}
      </div>
    </>
  );
}
