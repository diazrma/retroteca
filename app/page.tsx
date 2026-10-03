import DayView from "@/components/DayView";
import { today } from "@/lib/day";
import { getDay } from "@/lib/sources";

export const revalidate = 1800;

export default async function Home() {
  return <DayView day={await getDay(today())} />;
}
