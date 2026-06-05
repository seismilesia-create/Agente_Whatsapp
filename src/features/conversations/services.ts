import { createClient } from '@/lib/supabase/server'
import type { MessageSource, MessageDirection } from '@/shared/types/database'

const SIM_PHONE = 'simulador'

/** Contacto reservado para el simulador (uno por organización). */
async function getOrCreateSimContact(organizationId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', SIM_PHONE)
    .maybeSingle<{ id: string }>()
  if (existing) return existing.id

  const { data } = await supabase
    .from('contacts')
    .insert({ organization_id: organizationId, phone: SIM_PHONE, name: 'Cliente (simulador)', status: 'new' })
    .select('id')
    .single<{ id: string }>()
  return data?.id ?? null
}

/** Crea una conversación nueva para el simulador y devuelve su id. */
export async function createSimConversation(organizationId: string): Promise<string | null> {
  const supabase = await createClient()
  const contactId = await getOrCreateSimContact(organizationId)
  const { data } = await supabase
    .from('conversations')
    .insert({ organization_id: organizationId, contact_id: contactId, status: 'open' })
    .select('id')
    .single<{ id: string }>()
  return data?.id ?? null
}

export async function addMessage(params: {
  organizationId: string
  conversationId: string
  direction: MessageDirection
  source: MessageSource
  content: string
}): Promise<void> {
  const supabase = await createClient()
  await supabase.from('messages').insert({
    organization_id: params.organizationId,
    conversation_id: params.conversationId,
    direction: params.direction,
    source: params.source,
    content: params.content,
  })
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', params.conversationId)
}
