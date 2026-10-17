export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type Booking = {
  id: string;
  serviceName: string;
  status: string;
  startTime: string;
  endTime: string;
  price: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
};

export type DashboardData = {
  configured: boolean;
  customers: Customer[];
  bookings: Booking[];
  error: string | null;
  today: string;
};

export type CreateBookingResult =
  | { ok: true; notice?: string }
  | { ok: false; error: string };
