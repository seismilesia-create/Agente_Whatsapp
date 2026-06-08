'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertSuperAdmin } from '@/shared/lib/require-super-admin'

/** Cambia qué organización (agente) responde en el número de prueba de WhatsApp. */
export async function setActiveDemoAgentAction(orgId: string): Promise<void> {
  await assertSuperAdmin()
  const db = createAdminClient()
  await db.from('whatsapp_channels').update({ active_organization_id: orgId }).eq('is_test', true)
  revalidatePath('/demo')
  revalidatePath('/admin')
}
