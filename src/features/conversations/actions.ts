'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/shared/lib/get-session'
import { sendWhatsAppText } from '@/lib/whatsapp'

export interface SendState {
  error?: string
}

function revalidate(conversationId: string) {
  revalidatePath('/conversations')
  revalidatePath(`/conversations/${conversationId}`)
}

/** Pausa o reactiva el bot en una conversación (toma humana). */
export async function toggleBotPausedAction(conversationId: string, paused: boolean): Promise<void> {
  const supabase = await createClient()
  // Pausar = un humano toma el control (amarillo). Reactivar = vuelve al bot (verde).
  // En ambos casos la conversación deja de "necesitar" un humano: lo tiene o vuelve al bot.
  await supabase
    .from('conversations')
    .update({ bot_paused: paused, needs_human: false })
    .eq('id', conversationId)
  revalidate(conversationId)
}

/**
 * Envía un mensaje como humano: lo guarda (source=human), pausa el bot y lo manda
 * por WhatsApp (best-effort, con las credenciales del número de prueba).
 */
export async function sendHumanMessageAction(_prev: SendState, formData: FormData): Promise<SendState> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Sesión expirada' }

  const conversationId = String(formData.get('conversationId') ?? '')
  const text = String(formData.get('text') ?? '').trim()
  if (!conversationId || !text) return { error: 'Escribí un mensaje' }

  const supabase = await createClient()
  const { error } = await supabase.from('messages').insert({
    organization_id: ctx.organization.id,
    conversation_id: conversationId,
    direction: 'outbound',
    source: 'human',
    content: text,
  })
  if (error) return { error: 'No se pudo enviar el mensaje' }

  // Tomar el control: pausar el bot (amarillo), bajar la alerta de "necesita humano"
  // (ya lo tiene) y refrescar la marca de actividad.
  await supabase
    .from('conversations')
    .update({ bot_paused: true, needs_human: false, last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  // Envío real por WhatsApp (best-effort). En producción usaría las credenciales de la org.
  const { data: conv } = await supabase
    .from('conversations')
    .select('contact:contacts(phone)')
    .eq('id', conversationId)
    .maybeSingle()
  const rawContact = (conv as { contact: unknown } | null)?.contact
  const contact = Array.isArray(rawContact) ? rawContact[0] : rawContact
  const phone = (contact as { phone?: string } | null)?.phone
  const phoneNumberId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_TEST_ACCESS_TOKEN
  if (phone && phone !== 'simulador' && phoneNumberId && accessToken) {
    try {
      await sendWhatsAppText({ phoneNumberId, accessToken, to: phone, text })
    } catch {
      // best-effort: el mensaje ya quedó guardado en la bandeja
    }
  }

  revalidate(conversationId)
  return {}
}

/** Cierra o reabre una conversación. */
export async function setConversationStatusAction(
  conversationId: string,
  status: 'open' | 'closed',
): Promise<void> {
  const supabase = await createClient()
  // Cerrar → azul. Reabrir → vuelve al bot en verde (sin alertas ni pausa).
  const patch =
    status === 'open' ? { status, bot_paused: false, needs_human: false } : { status }
  await supabase.from('conversations').update(patch).eq('id', conversationId)
  revalidate(conversationId)
}
