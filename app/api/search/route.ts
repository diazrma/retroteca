import { cleanQuery, searchPins } from "@/lib/sources";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = cleanQuery(sp.get("q"));
  const page = Number(sp.get("p")) || 1;
  return Response.json(await searchPins(q, page), {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
