-- ============================================================================
-- Horarios: excepciones de calendario (feriados, vacaciones, horarios especiales)
-- + limpieza de business_config.default_service_duration_min (la duración real
--   vive en cada servicio del catálogo: services.duration_min).
-- ============================================================================

-- business_schedule_exceptions: pisan al horario semanal para fechas puntuales o rangos.
--   kind = 'closed'  → cerrado (feriado, vacaciones). Soporta rango start_date..end_date.
--   kind = 'custom'  → horario especial ese/esos días (usa `ranges`).
--   kind = 'open'    → abierto normal (marcador de feriado confirmado "sí atiendo").
--   ranges = [{ "open": "HH:MM", "close": "HH:MM" }, ...]  (solo se usa en 'custom')
create table if not exists public.business_schedule_exceptions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  start_date      date not null,
  end_date        date not null,
  kind            text not null check (kind in ('closed', 'custom', 'open')),
  ranges          jsonb not null default '[]'::jsonb,
  note            text,
  created_at      timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists idx_schedule_exc_org on public.business_schedule_exceptions(organization_id, start_date);

alter table public.business_schedule_exceptions enable row level security;

drop policy if exists schedule_exc_all on public.business_schedule_exceptions;
create policy schedule_exc_all on public.business_schedule_exceptions
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- La duración por defecto a nivel negocio no se usaba en ninguna lógica real
-- (cada servicio define su propia duration_min). Se elimina para no confundir.
alter table public.business_config drop column if exists default_service_duration_min;
