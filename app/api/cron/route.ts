import { revalidatePath } from "next/cache";
import { today } from "@/lib/day";
import { sendDaily } from "@/lib/push";
import { getDay } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A Vercel chama isto todo dia (vercel.json). Atualiza a home e manda os pushes.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const date = today();
  const day = await getDay(date); // aquece o cache das imagens do dia
  revalidatePath("/");
  revalidatePath("/arquivo");
  const push = await sendDaily(date);
  return Response.json({ date, pins: day.pins.length, push });
}
