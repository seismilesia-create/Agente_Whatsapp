-- ============================================================================
-- Super-admin (god-mode) + control por agente y feature flags por cliente.
--   - profiles.is_super_admin: acceso al panel /admin (cross-org vía service-role).
--   - organizations.agent_enabled: interruptor maestro on/off del agente del cliente.
--   - organizations.features: flags de add-ons por cliente, ej.
--     { "appointment_confirmation": true, "google_calendar": false }.
-- La cuenta super-admin se crea aparte (no en migración, para no versionar la contraseña).
-- ============================================================================

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

alter table public.organizations
  add column if not exists agent_enabled boolean not null default true;

alter table public.organizations
  add column if not exists features jsonb not null default '{}'::jsonb;
