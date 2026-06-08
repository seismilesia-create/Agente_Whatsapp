import { createAdminClient } from '@/lib/supabase/admin'
import type { Organization, BusinessConfig } from '@/shared/types/database'

/**
 * Data layer del panel super-admin. Usa el cliente SERVICE-ROLE (cross-org, bypassa RLS).
 * SOLO debe llamarse desde rutas /admin gateadas por requireSuperAdmin.
 */

type DB = ReturnType<typeof createAdminClient>

export interface ClientStats {
  org: Organization
  ownerEmail: string | null
  services: number
  contacts: number
  conversations: number
  appointments: number
  aiMessages: number
  humanMessages: number
  lastActivity: string | null
  isActiveDemo: boolean
}

async function excludedOrgIds(db: DB): Promise<Set<string>> {
  const { data } = await db.from('profiles').select('organization_id').eq('is_super_admin', true)
  return new Set(((data as { organization_id: string }[]) ?? []).map((p) => p.organization_id))
}

/** Todos los negocios cliente con sus métricas (excluye las orgs de super-admins). */
export async function getAdminClients(): Promise<ClientStats[]> {
  const db = createAdminClient()
  const excluded = await excludedOrgIds(db)

  const [orgsRes, services, contacts, conversations, appointments, messages, profiles, channel] =
    await Promise.all([
      db.from('organizations').select('*').order('created_at'),
      db.from('services').select('organization_id'),
      db.from('contacts').select('organization_id, phone'),
      db.from('conversations').select('organization_id, last_message_at'),
      db.from('appointments').select('organization_id'),
      db.from('messages').select('organization_id, source'),
      db.from('profiles').select('organization_id, email, created_at'),
      db.from('whatsapp_channels').select('active_organization_id').eq('is_test', true).maybeSingle(),
    ])

  const activeDemo =
    (channel.data as { active_organization_id: string | null } | null)?.active_organization_id ?? null
  const orgs = ((orgsRes.data as Organization[]) ?? []).filter((o) => !excluded.has(o.id))

  const svc = (services.data as { organization_id: string }[]) ?? []
  const cts = (contacts.data as { organization_id: string; phone: string }[]) ?? []
  const cvs = (conversations.data as { organization_id: string; last_message_at: string }[]) ?? []
  const apts = (appointments.data as { organization_id: string }[]) ?? []
  const msgs = (messages.data as { organization_id: string; source: string }[]) ?? []
  const profs =
    (profiles.data as { organization_id: string; email: string | null; created_at: string }[]) ?? []

  const byOrg = <T extends { organization_id: string }>(rows: T[], id: string) =>
    rows.filter((r) => r.organization_id === id)

  return orgs.map((o) => {
    const orgConvos = byOrg(cvs, o.id)
    const lastActivity = orgConvos.reduce<string | null>(
      (max, c) => (!max || c.last_message_at > max ? c.last_message_at : max),
      null,
    )
    const owner = byOrg(profs, o.id).sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
    return {
      org: o,
      ownerEmail: owner?.email ?? null,
      services: byOrg(svc, o.id).length,
      contacts: byOrg(cts, o.id).filter((c) => c.phone !== 'simulador').length,
      conversations: orgConvos.length,
      appointments: byOrg(apts, o.id).length,
      aiMessages: byOrg(msgs, o.id).filter((m) => m.source === 'ai').length,
      humanMessages: byOrg(msgs, o.id).filter((m) => m.source === 'human').length,
      lastActivity,
      isActiveDemo: activeDemo === o.id,
    }
  })
}

export interface AdminOverview {
  clients: number
  activeAgents: number
  conversations: number
  appointments: number
  contacts: number
  aiMessages: number
  humanMessages: number
}

/** Resumen global a partir de la lista de clientes. */
export function summarize(clients: ClientStats[]): AdminOverview {
  const sum = (f: (c: ClientStats) => number) => clients.reduce((acc, c) => acc + f(c), 0)
  return {
    clients: clients.length,
    activeAgents: clients.filter((c) => c.org.agent_enabled).length,
    conversations: sum((c) => c.conversations),
    appointments: sum((c) => c.appointments),
    contacts: sum((c) => c.contacts),
    aiMessages: sum((c) => c.aiMessages),
    humanMessages: sum((c) => c.humanMessages),
  }
}

/** Detalle de un cliente: sus métricas + resumen de configuración. */
export async function getAdminClient(
  orgId: string,
): Promise<{ stats: ClientStats; config: BusinessConfig | null } | null> {
  const clients = await getAdminClients()
  const stats = clients.find((c) => c.org.id === orgId)
  if (!stats) return null
  const db = createAdminClient()
  const { data: config } = await db
    .from('business_config')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()
  return { stats, config: (config as BusinessConfig) ?? null }
}
