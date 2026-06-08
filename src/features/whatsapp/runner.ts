import { createAdminClient } from '@/lib/supabase/admin'
import {
  parseIncomingMessage,
  sendWhatsAppText,
  sendWhatsAppImage,
  markAsRead,
  fetchWhatsAppMediaAsDataUrl,
} from '@/lib/whatsapp'
import { buildSystemPrompt, runAgentTurn } from '@/features/ai-agent/agent'
import {
  getBusinessConfigAdmin,
  getCatalogItemsAdmin,
  getBusinessHoursAdmin,
  getScheduleExceptionsAdmin,
  getAvailableSlotsAdmin,
  createAppointmentAdmin,
} from './admin-data'
import { toAbsoluteUrl } from '@/shared/lib/base-url'
import type { ChatMessage } from '@/lib/openrouter'
import type { Organization } from '@/shared/types/database'

interface ChannelRow {
  phone_number_id: string | null
  active_organization_id: string | null
}

/**
 * Procesa un webhook entrante de WhatsApp:
 * enruta al agente activo, corre la IA y responde. Best-effort, no lanza.
 */
export async function handleIncomingWhatsApp(payload: unknown): Promise<void> {
  const incoming = parseIncomingMessage(payload)
  if (!incoming || (incoming.type !== 'text' && incoming.type !== 'image')) return

  const phoneNumberId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_TEST_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return
  // Solo atendemos el número de prueba configurado
  if (incoming.phoneNumberId !== phoneNumberId) return

  const db = createAdminClient()

  // Canal de demo → agente activo (switch)
  const { data: channel } = await db
    .from('whatsapp_channels')
    .select('phone_number_id, active_organization_id')
    .eq('is_test', true)
    .maybeSingle()
  const ch = channel as ChannelRow | null
  const orgId = ch?.active_organization_id
  if (!orgId) {
    await sendWhatsAppText({
      phoneNumberId,
      accessToken,
      to: incoming.from,
      text: 'El agente de demo no está activo en este momento. Activá un rubro desde el panel.',
    })
    return
  }

  const { data: orgRow } = await db.from('organizations').select('*').eq('id', orgId).single()
  const org = orgRow as Organization | null
  if (!org) return
  // Interruptor maestro del super-admin: si el agente está desconectado, no responde.
  if (!org.agent_enabled) return

  markAsRead({ phoneNumberId, accessToken, to: incoming.from, messageId: incoming.messageId })

  // Contacto + conversación
  const contactId = await ensureContact(db, orgId, incoming.from, incoming.contactName)
  const conversationId = await ensureConversation(db, orgId, contactId)

  // Persistir mensaje entrante
  const inboundText = incoming.text || (incoming.type === 'image' ? '[imagen]' : '')
  await addMsg(db, orgId, conversationId, 'inbound', 'contact', inboundText)

  // Respetar el toggle de pausa: si un humano tomó el control, no responde la IA
  const { data: conv } = await db
    .from('conversations')
    .select('bot_paused')
    .eq('id', conversationId)
    .single()
  if ((conv as { bot_paused: boolean } | null)?.bot_paused) return

  // Cargar config + catálogo + horarios + historial
  const [config, catalog, hours, exceptions] = await Promise.all([
    getBusinessConfigAdmin(db, orgId),
    getCatalogItemsAdmin(db, orgId),
    getBusinessHoursAdmin(db, orgId),
    getScheduleExceptionsAdmin(db, orgId),
  ])
  if (!config) return

  const systemPrompt = buildSystemPrompt({
    config,
    organizationName: org.name,
    catalog,
    hours,
    exceptions,
    contactPhone: incoming.from,
    contactName: incoming.contactName,
  })
  const history = await loadHistory(db, conversationId, 12)

  // Imagen entrante → multimodal (visión)
  if (incoming.type === 'image' && incoming.mediaId) {
    const dataUrl = await fetchWhatsAppMediaAsDataUrl(incoming.mediaId, accessToken)
    if (dataUrl && history.length > 0) {
      const last = history[history.length - 1]
      if (last.role === 'user') {
        last.content = [
          { type: 'text', text: incoming.text || '(imagen)' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ]
      }
    }
  }

  let result
  try {
    result = await runAgentTurn({
      systemPrompt,
      history,
      catalog,
      deps: {
        getSlots: (serviceId) => getAvailableSlotsAdmin(db, orgId, serviceId),
        // El teléfono real es el número de WhatsApp del cliente, no lo que extraiga la IA.
        book: (input) => createAppointmentAdmin(db, orgId, org.name, { ...input, contactPhone: incoming.from }),
      },
    })
  } catch (e) {
    console.error('Agent error (whatsapp):', e)
    return
  }

  // Responder por WhatsApp + persistir
  if (result.reply) {
    await sendWhatsAppText({ phoneNumberId, accessToken, to: incoming.from, text: result.reply })
    await addMsg(db, orgId, conversationId, 'outbound', 'ai', result.reply)
  }
  for (const att of result.attachments) {
    if (att.type === 'image') {
      await sendWhatsAppImage({
        phoneNumberId,
        accessToken,
        to: incoming.from,
        imageUrl: toAbsoluteUrl(att.url),
        caption: att.caption,
      })
    }
  }
}

// ── helpers (admin) ──────────────────────────────────────────
async function ensureContact(
  db: ReturnType<typeof createAdminClient>,
  orgId: string,
  phone: string,
  name?: string,
): Promise<string | null> {
  const { data: existing } = await db
    .from('contacts')
    .select('id')
    .eq('organization_id', orgId)
    .eq('phone', phone)
    .maybeSingle()
  if (existing) return (existing as { id: string }).id
  const { data } = await db
    .from('contacts')
    .insert({ organization_id: orgId, phone, name: name ?? null, status: 'new' })
    .select('id')
    .single()
  return (data as { id: string } | null)?.id ?? null
}

async function ensureConversation(
  db: ReturnType<typeof createAdminClient>,
  orgId: string,
  contactId: string | null,
): Promise<string> {
  if (contactId) {
    const { data: open } = await db
      .from('conversations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (open) return (open as { id: string }).id
  }
  const { data } = await db
    .from('conversations')
    .insert({ organization_id: orgId, contact_id: contactId, status: 'open' })
    .select('id')
    .single()
  return (data as { id: string }).id
}

async function addMsg(
  db: ReturnType<typeof createAdminClient>,
  orgId: string,
  conversationId: string,
  direction: 'inbound' | 'outbound',
  source: 'ai' | 'human' | 'contact',
  content: string,
): Promise<void> {
  await db.from('messages').insert({
    organization_id: orgId,
    conversation_id: conversationId,
    direction,
    source,
    content,
  })
  await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId)
}

async function loadHistory(
  db: ReturnType<typeof createAdminClient>,
  conversationId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const { data } = await db
    .from('messages')
    .select('direction, source, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = ((data as { source: string; content: string }[]) ?? []).reverse()
  return rows.map((m) => ({
    role: m.source === 'contact' ? 'user' : 'assistant',
    content: m.content,
  }))
}
