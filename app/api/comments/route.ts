import { auth } from "@/auth";
import { resolvePin } from "@/lib/resolve";
import { addComment, getComments } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[\w-]{3,80}$/.test(id)) return Response.json([]);
  return Response.json(await getComments(id));
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) return Response.json({ error: "Faça login para comentar" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim().slice(0, 280);
  if (text.length < 2) return Response.json({ error: "Comentário muito curto" }, { status: 400 });
  const meta = await resolvePin(body.date, body.id, body.meta);
  if (!meta) return Response.json({ error: "Imagem não encontrada" }, { status: 404 });
  const comment = {
    id: crypto.randomUUID(),
    name: (user.name ?? "Retrozeiro").slice(0, 40),
    avatar: user.image ?? undefined,
    text,
    at: Date.now(),
  };
  const ok = await addComment(meta, comment, user.email);
  if (!ok) return Response.json({ error: "Calma, broto! Espere uns segundos." }, { status: 429 });
  return Response.json(comment);
}
