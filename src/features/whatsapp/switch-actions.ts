'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/** Cambia qué organización (agente) responde en el número de prueba de WhatsApp. */
export async function setActiveDemoAgentAction(orgId: string): Promise<void> {
  const db = createAdminClient()
  await db.from('whatsapp_channels').update({ active_organization_id: orgId }).eq('is_test', true)
  revalidatePath('/demo')
}
