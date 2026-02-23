import { getWeekStart, toISODate } from "@/lib/week-utils";
import { GroceryClient } from "./grocery-client";

// Server component — reads searchParams and passes weekStart + autoGenerate to the client.
export default async function GroceryPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string; generate?: string }>;
}) {
  const { weekStart, generate } = await searchParams;
  const resolvedWeekStart = weekStart ?? toISODate(getWeekStart());

  return (
    <GroceryClient
      weekStart={resolvedWeekStart}
      autoGenerate={generate === "true"}
    />
  );
}
