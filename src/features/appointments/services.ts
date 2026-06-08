import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/shared/lib/get-session'
import { isCalendarConfigured, createCalendarEvent } from '@/lib/google-calendar'
import type { Service, BusinessHour, Appointment, Contact, ScheduleException, AppointmentStatus } from '@/shared/types/database'
import {
  computeSlotsForDate,
  arDateString,
  weekdayOf,
  resolveDayHours,
  BOOKING_WINDOW_DAYS,
  type Slot,
} from './slots'

export async function getServices(): Promise<Service[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .eq('kind', 'service')
    .order('name')
  return (data as Service[]) ?? []
}

export async function getBusinessHours(): Promise<BusinessHour[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('business_hours').select('*').order('weekday')
  return (data as BusinessHour[]) ?? []
}

export async function getScheduleExceptions(): Promise<ScheduleException[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('business_schedule_exceptions')
    .select('*')
    .order('start_date')
  return (data as ScheduleException[]) ?? []
}

export interface DayAvailability {
  date: string // YYYY-MM-DD
  weekday: number
  slots: Slot[]
}

/**
 * Disponibilidad de un servicio para los próximos `days` días.
 * Combina horarios + turnos ocupados con el motor de slots.
 */
export async function getAvailableSlots(
  serviceId: string,
  days = BOOKING_WINDOW_DAYS,
): Promise<DayAvailability[]> {
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single<Service>()
  if (!service) return []

  const [hours, exceptions] = await Promise.all([getBusinessHours(), getScheduleExceptions()])
  const nowMs = Date.now()
  const fromIso = new Date(nowMs).toISOString()
  const toIso = new Date(nowMs + days * 86_400_000).toISOString()

  const { data: busy } = await supabase
    .from('appointments')
    .select('starts_at, ends_at, status')
    .gte('starts_at', fromIso)
    .lte('starts_at', toIso)
    .neq('status', 'cancelled')

  const busyRanges = (busy ?? []).map((b) => ({ starts_at: b.starts_at, ends_at: b.ends_at }))

  const result: DayAvailability[] = []
  for (let i = 0; i < days; i++) {
    const date = arDateString(nowMs, i)
    const weekday = weekdayOf(date)
    const { closed, hours: dayHours } = resolveDayHours({ date, weekday, weekly: hours, exceptions })
    if (closed || dayHours.length === 0) continue

    const slots = computeSlotsForDate({
      date,
      durationMin: service.duration_min,
      hours: dayHours,
      busy: busyRanges,
      nowMs,
    })
    if (slots.length > 0) result.push({ date, weekday, slots })
  }

  return result
}

export interface UpcomingAppointment extends Appointment {
  service: Pick<Service, 'name' | 'duration_min'> | null
  contact: Pick<Contact, 'name' | 'phone'> | null
}

export async function getUpcomingAppointments(limit = 50): Promise<UpcomingAppointment[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('appointments')
    .select('*, service:services(name, duration_min), contact:contacts(name, phone)')
    .neq('status', 'cancelled')
    .gte('starts_at', new Date(Date.now() - 3_600_000).toISOString())
    .order('starts_at')
    .limit(limit)
  return (data as UpcomingAppointment[]) ?? []
}

// ── Calendario (Agenda): turnos en un rango de fechas, con color de servicio ──

export interface CalendarService {
  id: string
  name: string
  color: string
  duration_min: number
}

export interface CalendarAppointment {
  id: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  service: CalendarService | null
  contact: { name: string | null; phone: string } | null
}

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

/** Turnos cuyo inicio cae en [fromIso, toIso] (RLS), con datos para pintarlos en el calendario. */
export async function getAppointmentsInRange(fromIso: string, toIso: string): Promise<CalendarAppointment[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at, status, service:services(id, name, color, duration_min), contact:contacts(name, phone)')
    .gte('starts_at', fromIso)
    .lte('starts_at', toIso)
    .order('starts_at')

  return ((data as unknown[]) ?? []).map((r) => {
    const row = r as {
      id: string
      starts_at: string
      ends_at: string
      status: AppointmentStatus
      service: unknown
      contact: unknown
    }
    return {
      id: row.id,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      status: row.status,
      service: firstOf(row.service as CalendarService | CalendarService[] | null),
      contact: firstOf(row.contact as { name: string | null; phone: string } | { name: string | null; phone: string }[] | null),
    }
  })
}

/** Busca o crea un contacto por teléfono dentro de la organización. */
async function upsertContact(
  organizationId: string,
  phone: string,
  name?: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phone)
    .maybeSingle<{ id: string }>()
  if (existing) return existing.id

  const { data: created } = await supabase
    .from('contacts')
    .insert({ organization_id: organizationId, phone, name: name ?? null, status: 'new' })
    .select('id')
    .single<{ id: string }>()
  return created?.id ?? null
}

export interface CreateAppointmentInput {
  serviceId: string
  startsAt: string // ISO
  contactPhone: string
  contactName?: string
  notes?: string
}

export interface CreateAppointmentResult {
  ok: boolean
  appointmentId?: string
  error?: string
}

/**
 * Reserva un turno. Valida que el slot siga libre (no overbooking) antes de insertar.
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<CreateAppointmentResult> {
  const ctx = await getSessionContext()
  if (!ctx) return { ok: false, error: 'Sesión expirada' }
  const supabase = await createClient()
  const orgId = ctx.organization.id

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', input.serviceId)
    .single<Service>()
  if (!service) return { ok: false, error: 'Servicio no encontrado' }

  const startMs = new Date(input.startsAt).getTime()
  const endMs = startMs + service.duration_min * 60_000
  const endsAt = new Date(endMs).toISOString()

  // Anti-overbooking: ¿hay algún turno que solape?
  const { data: overlap } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at')
    .neq('status', 'cancelled')
    .lt('starts_at', endsAt)
    .gt('ends_at', input.startsAt)
    .limit(1)
  if (overlap && overlap.length > 0) {
    return { ok: false, error: 'Ese horario ya fue tomado. Probá con otro.' }
  }

  const contactId = await upsertContact(orgId, input.contactPhone, input.contactName)

  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      organization_id: orgId,
      contact_id: contactId,
      service_id: input.serviceId,
      starts_at: input.startsAt,
      ends_at: endsAt,
      status: 'booked',
      notes: input.notes ?? null,
    })
    .select('id')
    .single<{ id: string }>()

  if (error) return { ok: false, error: 'No se pudo crear el turno' }

  // Espejar el turno en el Google Calendar compartido (best-effort)
  if (isCalendarConfigured()) {
    try {
      const who = input.contactName || input.contactPhone
      const eventId = await createCalendarEvent({
        summary: `[${ctx.organization.name}] ${service.name} — ${who}`,
        description: `Turno agendado por el agente.\nServicio: ${service.name}\nCliente: ${input.contactName ?? ''} (${input.contactPhone})`,
        startISO: input.startsAt,
        endISO: endsAt,
      })
      if (eventId) {
        await supabase.from('appointments').update({ google_event_id: eventId }).eq('id', appt.id)
      }
    } catch {
      // si Google falla, el turno igual queda en la agenda interna
    }
  }

  return { ok: true, appointmentId: appt.id }
}
