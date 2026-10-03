import { CATEGORY_BY_SLUG } from "@/lib/catalog";
import { removeSub, saveSub } from "@/lib/store";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const endpoint = String(b?.sub?.endpoint ?? "");
  const keys = b?.sub?.keys;
  if (!endpoint.startsWith("https://") || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: "Inscrição inválida" }, { status: 400 });
  }
  const cats = (Array.isArray(b.cats) ? b.cats : []).filter((c: unknown) => typeof c === "string" && CATEGORY_BY_SLUG[c]);
  if (!cats.length) await removeSub(endpoint);
  else await saveSub({ endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) }, cats });
  return Response.json({ ok: true, cats });
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b?.endpoint) await removeSub(String(b.endpoint));
  return Response.json({ ok: true });
}
