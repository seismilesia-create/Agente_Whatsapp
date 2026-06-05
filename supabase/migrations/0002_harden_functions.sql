-- ============================================================================
-- Hardening de seguridad (resuelve advisors de Supabase post-0001)
--  - search_path fijo en funciones
--  - revoca EXECUTE público de funciones SECURITY DEFINER vía RPC
-- ============================================================================

-- set_updated_at: search_path inmutable
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user: SOLO debe invocarla el trigger on_auth_user_created.
-- Nadie debe poder llamarla vía /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- current_org_id: la usan las RLS policies para usuarios autenticados.
-- Quitamos el acceso de anon/public y lo concedemos explícito a authenticated.
revoke execute on function public.current_org_id() from public, anon;
grant execute on function public.current_org_id() to authenticated;
