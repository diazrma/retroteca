import { auth } from "@/auth";
import { getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((s) => /^[\w-]{3,80}$/.test(s))
    .slice(0, 200);
  const session = await auth();
  return Response.json(await getStats(ids, session?.user?.email));
}
