-- ============================================================================
-- Motor de TURNOS (verticales: salud, estética, peluquería)
-- Tablas: services, business_hours, appointments
-- RLS por organization_id. updated_at trigger en appointments.
-- ============================================================================

do $$ begin
  create type appointment_status as enum ('booked', 'confirmed', 'cancelled', 'completed', 'no_show');
exception when duplicate_object then null; end $$;

-- services: catálogo de servicios del negocio (cada uno con su duración y precio/seña)
create table if not exists public.services (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  duration_min    int not null default 30,
  price           numeric(12,2) not null default 0,   -- precio de referencia / base de seña
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_services_org on public.services(organization_id);

-- business_hours: horarios de atención (permite turnos mañana/tarde por día → siesta)
create table if not exists public.business_hours (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),  -- 0=domingo … 6=sábado
  open_time       time not null,
  close_time      time not null
);
create index if not exists idx_business_hours_org on public.business_hours(organization_id);

-- appointments: turnos agendados
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id      uuid references public.contacts(id) on delete set null,
  service_id      uuid references public.services(id) on delete set null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          appointment_status not null default 'booked',
  notes           text,
  google_event_id text,                                 -- sincronización futura (Fase Calendar)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_appointments_org_start on public.appointments(organization_id, starts_at);
create index if not exists idx_appointments_contact on public.appointments(contact_id);

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated before update on public.appointments
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.services       enable row level security;
alter table public.business_hours enable row level security;
alter table public.appointments   enable row level security;

drop policy if exists services_all on public.services;
create policy services_all on public.services
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

drop policy if exists business_hours_all on public.business_hours;
create policy business_hours_all on public.business_hours
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

drop policy if exists appointments_all on public.appointments;
create policy appointments_all on public.appointments
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
