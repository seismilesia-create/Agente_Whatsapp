import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeSlotsForDate,
  arDateString,
  weekdayOf,
  resolveDayHours,
  pickException,
  BOOKING_WINDOW_DAYS,
  type ScheduleExceptionLite,
} from '@/features/appointments/slots'
import type { DayAvailability } from '@/features/appointments/services'
import { isCalendarConfigured, createCalendarEvent } from '@/lib/google-calendar'
import type { BusinessConfig, CatalogItemWithMedia, Service, BusinessHour, ScheduleException } from '@/shared/types/database'

/**
 * Versiones "admin" (service role + organizationId explícito) de los loaders y del booking.
 * Usadas por el webhook de WhatsApp, que corre sin sesión de usuario (sin RLS).
 */

export async function getBusinessConfigAdmin(
  db: SupabaseClient,
  orgId: string,
): Promise<BusinessConfig | null> {
  const { data } = await db.from('business_config').select('*').eq('organization_id', orgId).single()
  return (data as BusinessConfig) ?? null
}

export async function getCatalogItemsAdmin(
  db: SupabaseClient,
  orgId: string,
): Promise<CatalogItemWithMedia[]> {
  const { data } = await db
    .from('services')
    .select('*, media:catalog_media(*)')
    .eq('organization_id', orgId)
    .order('kind')
    .order('name')
  return (data as CatalogItemWithMedia[]) ?? []
}

export async function getBusinessHoursAdmin(
  db: SupabaseClient,
  orgId: string,
): Promise<BusinessHour[]> {
  const { data } = await db
    .from('business_hours')
    .select('*')
    .eq('organization_id', orgId)
    .order('weekday')
  return (data as BusinessHour[]) ?? []
}

export async function getScheduleExceptionsAdmin(
  db: SupabaseClient,
  orgId: string,
): Promise<ScheduleException[]> {
  const { data } = await db
    .from('business_schedule_exceptions')
    .select('*')
    .eq('organization_id', orgId)
    .order('start_date')
  return (data as ScheduleException[]) ?? []
}

export async function getAvailableSlotsAdmin(
  db: SupabaseClient,
  orgId: string,
  serviceId: string,
  days = BOOKING_WINDOW_DAYS,
): Promise<DayAvailability[]> {
  const { data: service } = await db
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('organization_id', orgId)
    .single()
  if (!service) return []
  const svc = service as Service

  const [hours, exceptions] = await Promise.all([
    getBusinessHoursAdmin(db, orgId),
    getScheduleExceptionsAdmin(db, orgId),
  ])

  const nowMs = Date.now()
  const fromIso = new Date(nowMs).toISOString()
  const toIso = new Date(nowMs + days * 86_400_000).toISOString()
  const { data: busy } = await db
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('organization_id', orgId)
    .neq('status', 'cancelled')
    .gte('starts_at', fromIso)
    .lte('starts_at', toIso)
  const busyRanges = (busy ?? []).map((b) => ({ starts_at: b.starts_at, ends_at: b.ends_at }))

  const result: DayAvailability[] = []
  for (let i = 0; i < days; i++) {
    const date = arDateString(nowMs, i)
    const weekday = weekdayOf(date)
    const { closed, hours: dayHours } = resolveDayHours({ date, weekday, weekly: hours, exceptions })
    if (closed || dayHours.length === 0) continue
    const slots = computeSlotsForDate({
      date,
      durationMin: svc.duration_min,
      hours: dayHours,
      busy: busyRanges,
      nowMs,
    })
    if (slots.length > 0) result.push({ date, weekday, slots })
  }
  return result
}

export async function createAppointmentAdmin(
  db: SupabaseClient,
  orgId: string,
  organizationName: string,
  input: { serviceId: string; startsAt: string; contactName?: string; contactPhone: string },
): Promise<{ ok: boolean; error?: string }> {
  const { data: service } = await db
    .from('services')
    .select('*')
    .eq('id', input.serviceId)
    .eq('organization_id', orgId)
    .single()
  if (!service) return { ok: false, error: 'Servicio no encontrado' }
  const svc = service as Service

  // No agendar en una fecha cerrada (feriado/vacaciones), aún si el slot venía cacheado.
  const startDate = arDateString(new Date(input.startsAt).getTime(), 0)
  const { data: excRows } = await db
    .from('business_schedule_exceptions')
    .select('start_date, end_date, kind, ranges')
    .eq('organization_id', orgId)
    .lte('start_date', startDate)
    .gte('end_date', startDate)
  if (pickException(startDate, (excRows as ScheduleExceptionLite[]) ?? [])?.kind === 'closed') {
    return { ok: false, error: 'Ese día el negocio está cerrado.' }
  }

  const startMs = new Date(input.startsAt).getTime()
  const endsAt = new Date(startMs + svc.duration_min * 60_000).toISOString()

  const { data: overlap } = await db
    .from('appointments')
    .select('id')
    .eq('organization_id', orgId)
    .neq('status', 'cancelled')
    .lt('starts_at', endsAt)
    .gt('ends_at', input.startsAt)
    .limit(1)
  if (overlap && overlap.length > 0) return { ok: false, error: 'Ese horario ya fue tomado. Probá con otro.' }

  // upsert contacto
  let contactId: string | null = null
  const { data: existing } = await db
    .from('contacts')
    .select('id')
    .eq('organization_id', orgId)
    .eq('phone', input.contactPhone)
    .maybeSingle()
  if (existing) contactId = (existing as { id: string }).id
  else {
    const { data: created } = await db
      .from('contacts')
      .insert({ organization_id: orgId, phone: input.contactPhone, name: input.contactName ?? null, status: 'new' })
      .select('id')
      .single()
    contactId = (created as { id: string } | null)?.id ?? null
  }

  const { data: appt, error } = await db
    .from('appointments')
    .insert({
      organization_id: orgId,
      contact_id: contactId,
      service_id: input.serviceId,
      starts_at: input.startsAt,
      ends_at: endsAt,
      status: 'booked',
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: 'No se pudo crear el turno' }

  // espejar en Google Calendar
  if (isCalendarConfigured()) {
    try {
      const who = input.contactName || input.contactPhone
      const eventId = await createCalendarEvent({
        summary: `[${organizationName}] ${svc.name} — ${who}`,
        description: `Turno agendado por WhatsApp.\nServicio: ${svc.name}\nCliente: ${input.contactName ?? ''} (${input.contactPhone})`,
        startISO: input.startsAt,
        endISO: endsAt,
      })
      if (eventId && appt) {
        await db.from('appointments').update({ google_event_id: eventId }).eq('id', (appt as { id: string }).id)
      }
    } catch {
      // best-effort
    }
  }

  return { ok: true }
}
