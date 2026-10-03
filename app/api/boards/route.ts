import { auth } from "@/auth";
import { addPin, createBoard, listMine, toPublic } from "@/lib/boards";
import { resolvePin } from "@/lib/resolve";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = (await auth())?.user;
  if (!user?.email) return Response.json({ error: "Faça login para ver seus murais" }, { status: 401 });
  return Response.json((await listMine(user.email)).map((b) => toPublic(b, user.email)));
}

/** Cria um mural (e já adiciona uma imagem, se vier). */
export async function POST(req: Request) {
  const user = (await auth())?.user;
  if (!user?.email) return Response.json({ error: "Faça login para criar murais" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    let b = await createBoard(
      { email: user.email, name: user.name ?? "Retrozeiro", image: user.image ?? undefined },
      String(body.title ?? "").trim(),
      String(body.desc ?? "").trim(),
    );
    if (body.pin) {
      const meta = await resolvePin(body.pin.date, body.pin.id, body.pin.meta);
      if (meta) b = await addPin(b.id, user.email, meta);
    }
    return Response.json(toPublic(b, user.email));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
