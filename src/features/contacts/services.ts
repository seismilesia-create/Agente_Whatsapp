import { createClient } from '@/lib/supabase/server'
import type { Contact } from '@/shared/types/database'

export interface ContactWithStats extends Contact {
  turnos: number
}

/**
 * Lista los contactos de la organización (RLS) con el conteo de turnos.
 * Oculta el contacto reservado del simulador. Ordena por última interacción.
 */
export async function getContacts(): Promise<ContactWithStats[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contacts')
    .select('*, appointments(count)')
    .neq('phone', 'simulador')
    .order('last_interaction_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const rows = (data as (Contact & { appointments: { count: number }[] })[]) ?? []
  return rows.map((c) => ({ ...c, turnos: c.appointments?.[0]?.count ?? 0 }))
}
