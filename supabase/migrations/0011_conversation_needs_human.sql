-- ============================================================================
-- Alarma de intervención humana: marca una conversación cuando el agente deriva
-- por dudas. El humano la ve resaltada en la bandeja + badge en el nav.
-- ============================================================================

alter table public.conversations
  add column if not exists needs_human boolean not null default false;

create index if not exists idx_conversations_needs_human
  on public.conversations(organization_id) where needs_human;
