import { redirect } from 'next/navigation'
import { getSessionContext, type SessionContext } from '@/shared/lib/get-session'

/**
 * Gating del panel god-mode. El super-admin ve TODOS los negocios vía service-role,
 * así que el acceso debe estar estrictamente limitado a `profiles.is_super_admin`.
 */

/** Para páginas/layouts server-side: redirige si no es super-admin. Devuelve el contexto. */
export async function requireSuperAdmin(): Promise<SessionContext> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login')
  if (!ctx.profile.is_super_admin) redirect('/dashboard')
  return ctx
}

/** Para server actions: lanza si quien llama no es super-admin. */
export async function assertSuperAdmin(): Promise<void> {
  const ctx = await getSessionContext()
  if (!ctx?.profile.is_super_admin) throw new Error('No autorizado')
}
