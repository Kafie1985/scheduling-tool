import { SchedulePage } from "@/components/schedule-page";

export const dynamic = "force-dynamic";

export default async function DashboardRoute({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const square = typeof params.square === "string" ? params.square : null;
  return <SchedulePage square={square} />;
}
