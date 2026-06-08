-- ============================================================================
-- Color por servicio, para identificarlos visualmente en el calendario de la Agenda.
-- ============================================================================

alter table public.services
  add column if not exists color text not null default '#6366f1';
