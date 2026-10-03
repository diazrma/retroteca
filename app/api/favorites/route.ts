import { auth } from "@/auth";
import { resolvePin } from "@/lib/resolve";
import { listFavs, toggleFav } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = (await auth())?.user?.email;
  if (!user) return Response.json({ error: "Faça login para ver seus favoritos" }, { status: 401 });
  return Response.json(await listFavs(user));
}

export async function POST(req: Request) {
  const user = (await auth())?.user?.email;
  if (!user) return Response.json({ error: "Faça login para favoritar" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const meta = await resolvePin(body.date, body.id, body.meta);
  if (!meta) return Response.json({ error: "Imagem não encontrada" }, { status: 404 });
  return Response.json({ saved: await toggleFav(meta, user) });
}
