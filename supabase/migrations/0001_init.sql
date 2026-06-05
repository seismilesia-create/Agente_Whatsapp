-- ============================================================================
-- Agente WhatsApp · Migración inicial (multi-tenant)
-- Tablas: organizations, profiles, business_config, whatsapp_config,
--         contacts, conversations, messages
-- Seguridad: RLS por organization_id en TODAS las tablas.
-- Onboarding: trigger que crea Organization + Profile + business_config al signup.
-- ============================================================================

-- ---------- Extensiones ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type org_vertical as enum ('ventas', 'turnos', 'institucional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type profile_role as enum ('owner', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_status as enum ('new', 'recurrent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Origen del mensaje: clave para el historial diferenciado por color
  create type message_source as enum ('ai', 'human', 'contact');
exception when duplicate_object then null; end $$;

do $$ begin
  create type whatsapp_status as enum ('disconnected', 'pending', 'connected');
exception when duplicate_object then null; end $$;

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLAS
-- ============================================================================

-- organizations: el tenant
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  vertical    org_vertical not null default 'ventas',
  plan        text not null default 'free',
  created_at  timestamptz not null default now()
);

-- profiles: usuarios del dashboard (ligados a auth.users)
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text,
  full_name       text,
  role            profile_role not null default 'owner',
  created_at      timestamptz not null default now()
);
create index if not exists idx_profiles_org on public.profiles(organization_id);

-- business_config: identidad y parámetros del agente (1 por organización)
create table if not exists public.business_config (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null unique references public.organizations(id) on delete cascade,
  agent_name                  text not null default 'Asistente',
  system_prompt               text not null default '',
  tone                        text not null default 'profesional y cordial',
  business_name               text,
  address                     text,
  faqs                        jsonb not null default '[]'::jsonb,  -- [{q, a}]
  greeting_message            text not null default '¡Hola! ¿En qué puedo ayudarte hoy?',
  handoff_message             text not null default 'Te transfiero con un asesor humano. Aguardá un momento.',
  default_service_duration_min int not null default 30,            -- usado en vertical turnos
  updated_at                  timestamptz not null default now(),
  created_at                  timestamptz not null default now()
);

-- whatsapp_config: credenciales del número (tokens cifrados, 1 por organización)
create table if not exists public.whatsapp_config (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references public.organizations(id) on delete cascade,
  phone_number_id         text,
  display_phone_number    text,
  verify_token            text,
  access_token_encrypted  text,   -- cifrado en la capa de app (gen-encryption-key.mjs)
  status                  whatsapp_status not null default 'disconnected',
  updated_at              timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

-- contacts: clientes finales (por organización)
create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone           text not null,
  name            text,
  status          contact_status not null default 'new',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (organization_id, phone)
);
create index if not exists idx_contacts_org on public.contacts(organization_id);

-- conversations: hilo de chat por contacto
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  bot_paused      boolean not null default false,  -- toggle de intervención humana
  status          conversation_status not null default 'open',
  assigned_to     uuid references public.profiles(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists idx_conversations_org on public.conversations(organization_id);
create index if not exists idx_conversations_contact on public.conversations(contact_id);

-- messages: cada mensaje de una conversación
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction       message_direction not null,
  source          message_source not null,  -- ai | human | contact (color del historial)
  content         text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_messages_org on public.messages(organization_id);

-- ---------- Triggers updated_at ----------
drop trigger if exists trg_business_config_updated on public.business_config;
create trigger trg_business_config_updated before update on public.business_config
  for each row execute function public.set_updated_at();

drop trigger if exists trg_whatsapp_config_updated on public.whatsapp_config;
create trigger trg_whatsapp_config_updated before update on public.whatsapp_config
  for each row execute function public.set_updated_at();

-- ============================================================================
-- MULTI-TENANT: helper para resolver la organización del usuario actual
-- security definer => evita recursión de RLS al leer profiles
-- ============================================================================
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- ============================================================================
-- ONBOARDING: al crear un usuario, crear Organization + Profile + config
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_name text;
  v_full_name text;
begin
  v_org_name  := coalesce(nullif(new.raw_user_meta_data->>'organization_name', ''), 'Mi Negocio');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');

  insert into public.organizations (name) values (v_org_name) returning id into v_org_id;

  insert into public.profiles (id, organization_id, email, full_name, role)
    values (new.id, v_org_id, new.email, v_full_name, 'owner');

  insert into public.business_config (organization_id) values (v_org_id);
  insert into public.whatsapp_config (organization_id) values (v_org_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS — habilitar en todas las tablas
-- ============================================================================
alter table public.organizations  enable row level security;
alter table public.profiles        enable row level security;
alter table public.business_config enable row level security;
alter table public.whatsapp_config enable row level security;
alter table public.contacts        enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;

-- organizations: el usuario ve / edita SOLO su organización
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
  for select using (id = public.current_org_id());
drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update using (id = public.current_org_id());

-- profiles: el usuario ve los perfiles de su organización; edita el propio
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (organization_id = public.current_org_id());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid());

-- Helper de políticas org-scoped (select/insert/update/delete) para tablas de datos
-- business_config
drop policy if exists bc_all on public.business_config;
create policy bc_all on public.business_config
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- whatsapp_config
drop policy if exists wc_all on public.whatsapp_config;
create policy wc_all on public.whatsapp_config
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- contacts
drop policy if exists contacts_all on public.contacts;
create policy contacts_all on public.contacts
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- conversations
drop policy if exists conversations_all on public.conversations;
create policy conversations_all on public.conversations
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- messages
drop policy if exists messages_all on public.messages;
create policy messages_all on public.messages
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
