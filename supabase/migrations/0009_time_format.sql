-- ============================================================================
-- Formato de hora preferido por el cliente para mostrar/editar los horarios
-- de atención (12 h o 24 h). Internamente las horas se siguen guardando como
-- 'HH:MM' (24 h); esto solo afecta la presentación en el panel y la agenda.
-- ============================================================================

alter table public.business_config
  add column if not exists time_format text not null default '24h'
  check (time_format in ('12h', '24h'));
