'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { businessConfigSchema } from './schemas'
import type { Faq } from '@/shared/types/database'

export interface ConfigState {
  error?: string
  success?: boolean
}

export async function updateBusinessConfigAction(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  // Las FAQs vienen serializadas como JSON desde el form (lista dinámica).
  let faqs: Faq[] = []
  try {
    const raw = formData.get('faqs')
    faqs = raw ? (JSON.parse(String(raw)) as Faq[]) : []
  } catch {
    return { error: 'Formato de FAQs inválido' }
  }

  const parsed = businessConfigSchema.safeParse({
    agent_name: formData.get('agent_name'),
    system_prompt: formData.get('system_prompt'),
    tone: formData.get('tone'),
    business_name: formData.get('business_name') ?? '',
    address: formData.get('address') ?? '',
    faqs,
    greeting_message: formData.get('greeting_message'),
    handoff_message: formData.get('handoff_message'),
    default_service_duration_min: formData.get('default_service_duration_min'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión expirada' }

  // RLS limita el update a la business_config de la organización del usuario.
  const { error } = await supabase
    .from('business_config')
    .update({
      agent_name: parsed.data.agent_name,
      system_prompt: parsed.data.system_prompt,
      tone: parsed.data.tone,
      business_name: parsed.data.business_name || null,
      address: parsed.data.address || null,
      faqs: parsed.data.faqs,
      greeting_message: parsed.data.greeting_message,
      handoff_message: parsed.data.handoff_message,
      default_service_duration_min: parsed.data.default_service_duration_min,
    })
    .not('id', 'is', null)

  if (error) {
    return { error: 'No se pudo guardar la configuración' }
  }

  revalidatePath('/config')
  return { success: true }
}
