import { Dashboard } from "@/components/dashboard";
import { loadDashboard } from "@/lib/dashboard-data";

export async function SchedulePage() {
  const data = await loadDashboard();
  return (
    <Dashboard
      configured={data.configured}
      customers={data.customers}
      bookings={data.bookings}
      error={data.error}
      today={data.today}
    />
  );
}
