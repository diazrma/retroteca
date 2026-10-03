import { auth } from "@/auth";
import { resolvePin } from "@/lib/resolve";
import { toggleLike } from "@/lib/store";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user?.email;
  if (!user) return Response.json({ error: "Faça login para curtir" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const meta = await resolvePin(body.date, body.id, body.meta);
  if (!meta) return Response.json({ error: "Imagem não encontrada" }, { status: 404 });
  return Response.json(await toggleLike(meta, user));
}
