import { createClient } from '@/lib/supabase/server'

export interface DashboardMetrics {
  totalConversations: number
  conversations30d: number
  botPausedCount: number
  aiMessages: number
  humanMessages: number
  totalContacts: number
  newContacts: number
  /** % de mensajes salientes resueltos por IA (vs humano). */
  aiResolutionRate: number
}

/**
 * Calcula los KPIs del dashboard para la organización actual.
 * RLS garantiza que solo cuenta filas de la organización del usuario.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const count = (q: { count: number | null }) => q.count ?? 0

  const [
    totalConv,
    conv30d,
    paused,
    aiMsg,
    humanMsg,
    contactsTotal,
    contactsNew,
  ] = await Promise.all([
    supabase.from('conversations').select('*', { count: 'exact', head: true }),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).gte('created_at', since30d),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('bot_paused', true),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('source', 'ai'),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('source', 'human'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'new'),
  ])

  const ai = count(aiMsg)
  const human = count(humanMsg)
  const outbound = ai + human
  const aiResolutionRate = outbound === 0 ? 0 : Math.round((ai / outbound) * 100)

  return {
    totalConversations: count(totalConv),
    conversations30d: count(conv30d),
    botPausedCount: count(paused),
    aiMessages: ai,
    humanMessages: human,
    totalContacts: count(contactsTotal),
    newContacts: count(contactsNew),
    aiResolutionRate,
  }
}
