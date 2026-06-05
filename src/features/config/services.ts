import { createClient } from '@/lib/supabase/server'
import type { BusinessConfig } from '@/shared/types/database'

/** Trae la configuración de negocio de la organización actual (RLS-scoped). */
export async function getBusinessConfig(): Promise<BusinessConfig | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('business_config').select('*').single<BusinessConfig>()
  return data
}
