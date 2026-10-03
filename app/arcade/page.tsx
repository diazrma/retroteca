import type { Metadata } from "next";
import Arcade from "@/components/Arcade";
import { dailyFor } from "@/lib/arcade";
import { addDays, today } from "@/lib/day";
import { arcadeTop } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const d = dailyFor(today());
  const description = `Jogo de hoje: ${d.game.name} (fase ${d.variantName}). Bata a meta de ${d.target} pontos e entre no ranking. Todo dia um jogo novo.`;
  return { title: `Arcade: ${d.game.name}`, description, openGraph: { title: `${d.game.emoji} ${d.game.name} · Arcade da Retroteca`, description } };
}

export default async function ArcadePage() {
  const date = today();
  const y = dailyFor(addDays(date, -1));
  const champ = (await arcadeTop(y.date, 1).catch(() => null))?.top[0] ?? null;
  return <Arcade daily={dailyFor(date)} yesterday={{ name: y.game.name, emoji: y.game.emoji, champ }} />;
}
