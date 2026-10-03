import { auth } from "@/auth";
import { addPin, removePin, toPublic } from "@/lib/boards";
import { resolvePin } from "@/lib/resolve";

type P = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: P) {
  const user = (await auth())?.user?.email;
  if (!user) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const meta = await resolvePin(body.date, body.id, body.meta);
  if (!meta) return Response.json({ error: "Imagem não encontrada" }, { status: 404 });
  try {
    return Response.json(toPublic(await addPin((await params).id, user, meta), user));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 403 });
  }
}

export async function DELETE(req: Request, { params }: P) {
  const user = (await auth())?.user?.email;
  if (!user) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    return Response.json(toPublic(await removePin((await params).id, user, String(body.id ?? "")), user));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 403 });
  }
}
