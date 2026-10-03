import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PinPage from "@/components/PinPage";
import { isValidDay, today } from "@/lib/day";
import { findPin, SEARCH_PREFIX } from "@/lib/sources";

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ date: string; id: string }> };

async function find(date: string, id: string) {
  if (!date.startsWith(SEARCH_PREFIX) && !isValidDay(date)) return null;
  return findPin(date, id);
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { date, id } = await params;
  const pin = await find(date, id);
  if (!pin) return {};
  return {
    title: pin.title,
    description: pin.caption,
    openGraph: { title: pin.title + " · Retroteca", description: pin.caption, images: [pin.full] },
    twitter: { card: "summary_large_image", images: [pin.full] },
  };
}

export default async function Page({ params }: P) {
  const { date, id } = await params;
  const pin = await find(date, id);
  if (!pin) notFound();
  return (
    <div className="wrap">
      <p style={{ marginTop: 24 }}>
        {date.startsWith(SEARCH_PREFIX) ? (
          <Link className="btn" href={`/busca?q=${date.slice(SEARCH_PREFIX.length).split("~")[0]}`}>◀ Voltar para a busca</Link>
        ) : (
          <Link className="btn" href={date === today() ? "/" : `/dia/${date}`}>◀ Ver a fita completa</Link>
        )}
      </p>
      <PinPage pin={pin} date={date} />
    </div>
  );
}
