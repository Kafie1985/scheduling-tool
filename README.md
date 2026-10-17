# Scheduling tool

Next.js dashboard for bookings and customers.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

If `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` is missing, the page still loads. Bookings and customers stay empty, and saving a booking is disabled.

Booking times are Mountain Time (`America/Denver`).
