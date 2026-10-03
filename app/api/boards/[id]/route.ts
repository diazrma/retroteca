import { auth } from "@/auth";
import { deleteBoard, getBoard, toPublic, updateBoard } from "@/lib/boards";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: P) {
  const b = await getBoard((await params).id);
  if (!b) return Response.json({ error: "Mural não encontrado" }, { status: 404 });
  return Response.json(toPublic(b, (await auth())?.user?.email));
}

export async function PATCH(req: Request, { params }: P) {
  const user = (await auth())?.user?.email;
  if (!user) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    return Response.json(toPublic(await updateBoard((await params).id, user, body), user));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 403 });
  }
}

export async function DELETE(_: Request, { params }: P) {
  const user = (await auth())?.user?.email;
  if (!user) return Response.json({ error: "Faça login" }, { status: 401 });
  try {
    await deleteBoard((await params).id, user);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 403 });
  }
}
