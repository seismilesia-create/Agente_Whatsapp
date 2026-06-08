'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertSuperAdmin } from '@/shared/lib/require-super-admin'

function revalidate(orgId: string) {
  revalidatePath('/admin')
  revalidatePath(`/admin/clientes/${orgId}`)
}

/** Interruptor maestro on/off del agente de un cliente. */
export async function toggleAgentEnabledAction(orgId: string, enabled: boolean): Promise<void> {
  await assertSuperAdmin()
  const db = createAdminClient()
  await db.from('organizations').update({ agent_enabled: enabled }).eq('id', orgId)
  revalidate(orgId)
}

/** Habilita/deshabilita una feature (add-on) para un cliente. */
export async function toggleFeatureAction(orgId: string, key: string, enabled: boolean): Promise<void> {
  await assertSuperAdmin()
  const db = createAdminClient()
  const { data } = await db.from('organizations').select('features').eq('id', orgId).maybeSingle()
  const current = (data as { features: Record<string, boolean> } | null)?.features ?? {}
  await db
    .from('organizations')
    .update({ features: { ...current, [key]: enabled } })
    .eq('id', orgId)
  revalidate(orgId)
}
