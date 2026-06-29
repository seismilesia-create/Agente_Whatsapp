'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/shared/lib/get-session'
import {
  businessConfigSchema,
  businessHourRowSchema,
  scheduleExceptionRowSchema,
  type BusinessHourRow,
  type ScheduleExceptionRow,
} from './schemas'
import type { Faq } from '@/shared/types/database'

export interface ConfigState {
  error?: string
  success?: boolean
}

type DbClient = Awaited<ReturnType<typeof createClient>>

/** Reemplaza horarios semanales y excepciones de la organización (borra y reinserta). */
async function persistSchedule(
  supabase: DbClient,
  orgId: string,
  hours: BusinessHourRow[],
  exceptions: ScheduleExceptionRow[],
): Promise<boolean> {
  const { error: delH } = await supabase.from('business_hours').delete().eq('organization_id', orgId)
  if (delH) return false
  if (hours.length > 0) {
    const { error } = await supabase.from('business_hours').insert(
      hours.map((h) => ({
        organization_id: orgId,
        weekday: h.weekday,
        open_time: h.open_time,
        close_time: h.close_time,
      })),
    )
    if (error) return false
  }

  const { error: delE } = await supabase
    .from('business_schedule_exceptions')
    .delete()
    .eq('organization_id', orgId)
  if (delE) return false
  if (exceptions.length > 0) {
    const { error } = await supabase.from('business_schedule_exceptions').insert(
      exceptions.map((e) => ({
        organization_id: orgId,
        start_date: e.start_date,
        end_date: e.end_date,
        kind: e.kind,
        ranges: e.ranges,
        note: e.note || null,
      })),
    )
    if (error) return false
  }
  return true
}

export async function updateBusinessConfigAction(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  // FAQs, horarios y excepciones vienen serializados como JSON desde el form (listas dinámicas).
  let faqs: Faq[] = []
  let hoursRaw: unknown = []
  let excRaw: unknown = []
  try {
    const rawFaqs = formData.get('faqs')
    faqs = rawFaqs ? (JSON.parse(String(rawFaqs)) as Faq[]) : []
    hoursRaw = JSON.parse(String(formData.get('business_hours_json') ?? '[]'))
    excRaw = JSON.parse(String(formData.get('exceptions_json') ?? '[]'))
  } catch {
    return { error: 'Formato de datos inválido' }
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
    require_dni: formData.get('require_dni') === 'true',
    require_insurance: formData.get('require_insurance') === 'true',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const hoursParsed = z.array(businessHourRowSchema).safeParse(hoursRaw)
  const excParsed = z.array(scheduleExceptionRowSchema).safeParse(excRaw)
  if (!hoursParsed.success || !excParsed.success) {
    return { error: 'Datos de horarios inválidos' }
  }

  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Sesión expirada' }
  const supabase = await createClient()
  const orgId = ctx.organization.id

  const updatePayload: Record<string, unknown> = {
    agent_name: parsed.data.agent_name,
    system_prompt: parsed.data.system_prompt,
    tone: parsed.data.tone,
    business_name: parsed.data.business_name || null,
    address: parsed.data.address || null,
    faqs: parsed.data.faqs,
    greeting_message: parsed.data.greeting_message,
    handoff_message: parsed.data.handoff_message,
    require_dni: parsed.data.require_dni,
    require_insurance: parsed.data.require_insurance,
  }

  // Formato de hora preferido (12h/24h) para mostrar los horarios.
  updatePayload.time_format = formData.get('time_format') === '12h' ? '12h' : '24h'

  // Confirmación de turno: solo si el form la incluyó (= feature premium habilitada para esta org).
  if (formData.has('confirmation_hours_before')) {
    const h = Math.round(Number(formData.get('confirmation_hours_before')))
    updatePayload.confirmation_hours_before = Number.isFinite(h) && h >= 1 && h <= 168 ? h : 24
    const msg = String(formData.get('confirmation_message') ?? '').trim()
    updatePayload.confirmation_message = msg || null
  }

  const { error } = await supabase.from('business_config').update(updatePayload).eq('organization_id', orgId)

  if (error) {
    return { error: 'No se pudo guardar la configuración' }
  }

  const ok = await persistSchedule(supabase, orgId, hoursParsed.data, excParsed.data)
  if (!ok) return { error: 'No se pudieron guardar los horarios' }

  revalidatePath('/config')
  revalidatePath('/agenda')
  return { success: true }
}
