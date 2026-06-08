-- ============================================================================
-- Confirmación de turno (feature premium, gateada por organizations.features.appointment_confirmation).
--   - appointments.confirmation_sent_at: marca anti-reenvío del recordatorio.
--   - business_config.confirmation_hours_before: cuántas horas antes avisar (lo decide el cliente).
--   - business_config.confirmation_message: texto custom (null = usa el template por defecto).
--     Placeholders soportados: {nombre} {servicio} {fecha} {hora} {negocio}
-- ============================================================================

alter table public.appointments
  add column if not exists confirmation_sent_at timestamptz;

alter table public.business_config
  add column if not exists confirmation_hours_before int not null default 24;

alter table public.business_config
  add column if not exists confirmation_message text;
