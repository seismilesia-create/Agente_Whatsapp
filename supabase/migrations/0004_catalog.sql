-- ============================================================================
-- CATÁLOGO unificado: extiende `services` para soportar productos y servicios,
-- con características flexibles, stock y media (fotos/videos).
-- ============================================================================

do $$ begin
  create type catalog_kind as enum ('service', 'product');
exception when duplicate_object then null; end $$;

-- Extender la tabla de servicios → catálogo
alter table public.services
  add column if not exists kind catalog_kind not null default 'service',
  add column if not exists description text not null default '',
  add column if not exists attributes jsonb not null default '[]'::jsonb, -- [{label, value}]
  add column if not exists stock int; -- null = no se controla stock (típico en servicios)

-- Media del catálogo (fotos/videos en Supabase Storage)
create table if not exists public.catalog_media (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id      uuid not null references public.services(id) on delete cascade,
  url             text not null,           -- URL pública del archivo
  path            text not null,           -- ruta en el bucket (para borrarlo)
  type            text not null default 'image', -- 'image' | 'video'
  sort            int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists idx_catalog_media_service on public.catalog_media(service_id);

alter table public.catalog_media enable row level security;
drop policy if exists catalog_media_all on public.catalog_media;
create policy catalog_media_all on public.catalog_media
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- ---------- Supabase Storage: bucket público para media del catálogo ----------
insert into storage.buckets (id, name, public)
values ('catalog-media', 'catalog-media', true)
on conflict (id) do nothing;

-- Lectura pública (las fotos se comparten con clientes por WhatsApp)
drop policy if exists "catalog_media_read" on storage.objects;
create policy "catalog_media_read" on storage.objects
  for select using (bucket_id = 'catalog-media');

-- Subida/borrado: solo usuarios autenticados, dentro de la carpeta de SU organización
-- Convención de path: {organization_id}/{service_id}/{archivo}
drop policy if exists "catalog_media_insert" on storage.objects;
create policy "catalog_media_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

drop policy if exists "catalog_media_delete" on storage.objects;
create policy "catalog_media_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'catalog-media'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
