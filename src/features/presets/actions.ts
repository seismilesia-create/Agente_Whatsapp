'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/shared/lib/get-session'
import { getPreset } from './presets'

export interface PresetState {
  error?: string
  success?: boolean
}

/**
 * Aplica un preset de rubro a la organización del usuario:
 * - setea el vertical de la organización
 * - rellena business_config (system prompt, FAQs, mensajes, tono)
 * - reemplaza el catálogo de services y los business_hours por los del preset
 */
export async function applyPresetAction(presetKey: string): Promise<PresetState> {
  const preset = getPreset(presetKey)
  if (!preset) return { error: 'Preset desconocido' }

  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Sesión expirada' }

  const supabase = await createClient()
  const orgId = ctx.organization.id

  // 1) vertical de la organización
  const { error: orgErr } = await supabase
    .from('organizations')
    .update({ vertical: preset.vertical })
    .eq('id', orgId)
  if (orgErr) return { error: 'No se pudo actualizar la organización' }

  // 2) business_config
  const { error: bcErr } = await supabase
    .from('business_config')
    .update({
      agent_name: preset.agent_name,
      tone: preset.tone,
      system_prompt: preset.system_prompt,
      greeting_message: preset.greeting_message,
      handoff_message: preset.handoff_message,
      faqs: preset.faqs,
    })
    .eq('organization_id', orgId)
  if (bcErr) return { error: 'No se pudo aplicar la configuración' }

  // 3) services — reemplazar catálogo
  await supabase.from('services').delete().eq('organization_id', orgId)
  const { error: svcErr } = await supabase.from('services').insert(
    preset.services.map((s) => ({
      organization_id: orgId,
      name: s.name,
      kind: s.kind ?? 'service',
      duration_min: s.duration_min,
      price: s.price,
      description: s.description ?? null,
      color: s.color ?? null,
      stock: s.stock ?? null,
    })),
  )
  if (svcErr) return { error: 'No se pudieron cargar los servicios' }

  // 4) business_hours — reemplazar horarios
  await supabase.from('business_hours').delete().eq('organization_id', orgId)
  const { error: bhErr } = await supabase.from('business_hours').insert(
    preset.business_hours.map((h) => ({
      organization_id: orgId,
      weekday: h.weekday,
      open_time: h.open_time,
      close_time: h.close_time,
    })),
  )
  if (bhErr) return { error: 'No se pudieron cargar los horarios' }

  revalidatePath('/config')
  revalidatePath('/dashboard')
  revalidatePath('/agenda')
  return { success: true }
}
