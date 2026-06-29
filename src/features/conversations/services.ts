import { createClient } from '@/lib/supabase/server'
import type { MessageSource, MessageDirection, ConversationStatus } from '@/shared/types/database'

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

// ── Bandeja de conversaciones (inbox) ─────────────────────────────────

export interface ConversationContact {
  id: string
  name: string | null
  last_name: string | null
  phone: string
}

export interface ConversationListItem {
  id: string
  bot_paused: boolean
  needs_human: boolean
  status: ConversationStatus
  last_message_at: string
  contact: ConversationContact | null
  preview: string | null
}

export interface ConversationMessage {
  id: string
  direction: MessageDirection
  source: MessageSource
  content: string
  created_at: string
}

export interface ConversationDetail {
  id: string
  bot_paused: boolean
  status: ConversationStatus
  contact: ConversationContact | null
  messages: ConversationMessage[]
}

/** Supabase devuelve el embed to-one como objeto o array según versión; normalizamos. */
function firstContact(c: unknown): ConversationContact | null {
  if (!c) return null
  const v = Array.isArray(c) ? c[0] : c
  return (v as ConversationContact) ?? null
}

/** Lista de conversaciones (RLS) con contacto y preview del último mensaje. */
export async function getConversations(): Promise<ConversationListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('conversations')
    .select('id, bot_paused, needs_human, status, last_message_at, contact:contacts(id, name, last_name, phone)')
    .order('last_message_at', { ascending: false })
    .limit(100)

  const rows =
    (data as {
      id: string
      bot_paused: boolean
      needs_human: boolean
      status: ConversationStatus
      last_message_at: string
      contact: unknown
    }[]) ?? []
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, content, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false })

  const preview = new Map<string, string>()
  for (const m of (msgs as { conversation_id: string; content: string }[]) ?? []) {
    if (!preview.has(m.conversation_id)) preview.set(m.conversation_id, m.content)
  }

  return rows.map((r) => ({
    id: r.id,
    bot_paused: r.bot_paused,
    needs_human: r.needs_human,
    status: r.status,
    last_message_at: r.last_message_at,
    contact: firstContact(r.contact),
    preview: preview.get(r.id) ?? null,
  }))
}

/** Una conversación con su contacto y todos sus mensajes (orden cronológico). */
export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const supabase = await createClient()
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, bot_paused, status, contact:contacts(id, name, last_name, phone)')
    .eq('id', id)
    .maybeSingle()
  if (!conv) return null
  const c = conv as { id: string; bot_paused: boolean; status: ConversationStatus; contact: unknown }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, direction, source, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return {
    id: c.id,
    bot_paused: c.bot_paused,
    status: c.status,
    contact: firstContact(c.contact),
    messages: (messages as ConversationMessage[]) ?? [],
  }
}
