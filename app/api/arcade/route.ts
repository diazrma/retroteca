import { auth } from "@/auth";
import { cleanNick, dailyFor } from "@/lib/arcade";
import { addDays, today } from "@/lib/day";
import { arcadeTop, saveArcadeScore } from "@/lib/store";

export const dynamic = "force-dynamic";

const PID = /^[a-z0-9]{8,32}$/;

/** Quem está jogando: a conta Google, ou um id anônimo guardado no navegador. */
async function playerOf(pid: unknown) {
  const user = (await auth())?.user;
  if (user?.email) return { id: "u:" + user.email, name: user.name?.split(" ")[0] };
  return typeof pid === "string" && PID.test(pid) ? { id: "a:" + pid, name: undefined } : null;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const date = u.searchParams.get("date") === "ontem" ? addDays(today(), -1) : today();
  const p = await playerOf(u.searchParams.get("pid"));
  return Response.json({ date, ...(await arcadeTop(date, 10, p?.id)) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const date = today();
  // aceita a partida que começou antes da meia-noite
  if (body.date !== date && body.date !== addDays(date, -1)) return Response.json({ error: "Esse jogo já acabou." }, { status: 400 });
  const daily = dailyFor(body.date);
  const score = Number(body.score);
  if (!Number.isInteger(score) || score <= 0 || score > daily.game.max) return Response.json({ error: "Pontuação inválida." }, { status: 400 });
  const p = await playerOf(body.pid);
  if (!p) return Response.json({ error: "Jogador inválido." }, { status: 400 });
  const name = p.name || cleanNick(body.name) || "Anônimo";
  const ok = await saveArcadeScore(body.date, p.id, name, score);
  if (!ok) return Response.json({ error: "Calma! Espere uns segundos." }, { status: 429 });
  return Response.json({ date: body.date, ...(await arcadeTop(body.date, 10, p.id)) });
}
