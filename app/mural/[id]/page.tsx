import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import BoardView from "@/components/BoardView";
import { getBoard, toPublic } from "@/lib/boards";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const b = await getBoard((await params).id);
  if (!b) return {};
  const description = b.desc || `${b.pins.length} imagens retrô reunidas por ${b.ownerName.split(" ")[0]} na Retroteca.`;
  return {
    title: b.title,
    description,
    openGraph: { title: `${b.title} · mural na Retroteca`, description, images: b.pins[0] ? [b.pins[0].src] : ["/og.jpg"] },
  };
}

export default async function MuralPage({ params }: P) {
  const b = await getBoard((await params).id);
  if (!b) notFound();
  const user = (await auth())?.user?.email;
  return <BoardView initial={toPublic(b, user)} />;
}
