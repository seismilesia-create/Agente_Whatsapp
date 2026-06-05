import { createClient } from '@/lib/supabase/server'
import type { Organization, Profile } from '@/shared/types/database'

export interface SessionContext {
  userId: string
  email: string | null
  profile: Profile
  organization: Organization
}

/**
 * Resuelve el usuario autenticado + su profile + su organización.
 * Devuelve null si no hay sesión. Usar en layouts/páginas server-side.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single<Profile & { organizations: Organization }>()

  if (!profile) return null

  const { organizations, ...rest } = profile
  return {
    userId: user.id,
    email: user.email ?? null,
    profile: rest as Profile,
    organization: organizations as Organization,
  }
}
