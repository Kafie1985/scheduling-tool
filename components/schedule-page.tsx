import { Dashboard } from "@/components/dashboard";
import { loadDashboard } from "@/lib/dashboard-data";
import { isSquareConnected } from "@/lib/square/connection";

export async function SchedulePage({ square }: { square: string | null }) {
  const [data, squareConnected] = await Promise.all([loadDashboard(), isSquareConnected()]);
  return (
    <Dashboard
      configured={data.configured}
      customers={data.customers}
      bookings={data.bookings}
      error={data.error}
      today={data.today}
      squareConnected={squareConnected}
      squareBanner={squareBanner(square, squareConnected)}
    />
  );
}

function squareBanner(
  square: string | null,
  connected: boolean,
): { tone: "ok" | "warn"; message: string } | null {
  if (square === "connected") {
    return connected
      ? { tone: "ok", message: "Square is connected." }
      : { tone: "warn", message: "Square could not be connected. Try again." };
  }
  if (square === "denied") return { tone: "warn", message: "Square authorization was canceled." };
  if (square === "unconfigured") {
    return {
      tone: "warn",
      message:
        "Square is not configured. Add SQUARE_ENVIRONMENT, SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET, and SQUARE_REDIRECT_URL.",
    };
  }
  if (square === "error") {
    return { tone: "warn", message: "Square could not be connected. Try again." };
  }
  return null;
}
