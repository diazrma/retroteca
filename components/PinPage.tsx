"use client";
import type { Pin } from "@/lib/sources";
import PinDetail from "./PinDetail";
import { useLikes } from "./useLikes";

export default function PinPage({ pin, date }: { pin: Pin; date: string }) {
  const { stats, like, save } = useLikes([pin.id], date, () => pin);
  return <PinDetail page pin={pin} date={date} stat={stats[pin.id]} onLike={() => like(pin.id)} onSave={() => save(pin.id)} />;
}
