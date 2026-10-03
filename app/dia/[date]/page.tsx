import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import DayView from "@/components/DayView";
import { formatDay, isValidDay, today } from "@/lib/day";
import { getDay } from "@/lib/sources";

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type P = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { date } = await params;
  return { title: "Fita de " + formatDay(date) };
}

export default async function DayPage({ params }: P) {
  const { date } = await params;
  if (date === today()) redirect("/");
  if (!isValidDay(date)) notFound();
  return <DayView day={await getDay(date)} />;
}
