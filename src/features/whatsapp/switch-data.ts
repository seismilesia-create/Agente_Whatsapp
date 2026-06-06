import { createAdminClient } from '@/lib/supabase/admin'

export interface DemoOrg {
  id: string
  name: string
  vertical: string
}

export interface DemoSwitchData {
  orgs: DemoOrg[]
  activeId: string | null
  configured: boolean // ¿ya están las credenciales del número de prueba?
}

/** Datos del switch de demo (agente activo en el número de prueba). Server-only. */
export async function getDemoSwitch(): Promise<DemoSwitchData> {
  const db = createAdminClient()
  const { data: orgs } = await db.from('organizations').select('id, name, vertical').order('name')
  const { data: ch } = await db
    .from('whatsapp_channels')
    .select('active_organization_id, phone_number_id')
    .eq('is_test', true)
    .maybeSingle()

  const channel = ch as { active_organization_id: string | null; phone_number_id: string | null } | null
  return {
    orgs: (orgs as DemoOrg[]) ?? [],
    activeId: channel?.active_organization_id ?? null,
    configured: Boolean(channel?.phone_number_id || process.env.WHATSAPP_TEST_PHONE_NUMBER_ID),
  }
}
