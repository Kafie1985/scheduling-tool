-- Square Sandbox OAuth tokens. One row per merchant.
-- Does not change customers or bookings.
-- The service role writes this table and bypasses RLS.
-- RLS is enabled with no policies, so anon and authenticated cannot read tokens.

create table public.square_connections (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint square_connections_merchant_id_key unique (merchant_id),
  constraint square_connections_values_present check (
    char_length(merchant_id) > 0
    and char_length(access_token) > 0
    and char_length(refresh_token) > 0
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger square_connections_set_updated_at
  before update on public.square_connections
  for each row execute function public.set_updated_at();

alter table public.square_connections enable row level security;

revoke all on table public.square_connections from public;
revoke all on table public.square_connections from anon;
revoke all on table public.square_connections from authenticated;

grant all on table public.square_connections to service_role;
