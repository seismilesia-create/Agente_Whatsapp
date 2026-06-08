'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getAvailableSlots,
  createAppointment,
  getAppointmentsInRange,
  type DayAvailability,
  type CalendarAppointment,
} from './services'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import type { AppointmentStatus } from '@/shared/types/database'

export async function getSlotsAction(serviceId: string): Promise<DayAvailability[]> {
  if (!serviceId) return []
  return getAvailableSlots(serviceId, 10)
}

/** Turnos de un rango (para navegar mes/semana en el calendario sin recargar la página). */
export async function getRangeAppointmentsAction(
  fromIso: string,
  toIso: string,
): Promise<CalendarAppointment[]> {
  return getAppointmentsInRange(fromIso, toIso)
}

export interface BookState {
  error?: string
  success?: string
}

export async function bookAppointmentAction(_prev: BookState, formData: FormData): Promise<BookState> {
  const serviceId = String(formData.get('serviceId') ?? '')
  const startsAt = String(formData.get('startsAt') ?? '')
  const contactName = String(formData.get('contactName') ?? '').trim()
  const contactPhone = String(formData.get('contactPhone') ?? '').trim()

  if (!serviceId || !startsAt) return { error: 'Elegí servicio y horario' }
  if (!contactPhone) return { error: 'Ingresá el teléfono del cliente' }

  const res = await createAppointment({
    serviceId,
    startsAt,
    contactPhone,
    contactName: contactName || undefined,
  })

  if (!res.ok) return { error: res.error ?? 'No se pudo reservar' }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  return { success: 'Turno reservado ✓' }
}

export async function setAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<void> {
  const supabase = await createClient()

  // Si se cancela, borrar el evento del Google Calendar
  if (status === 'cancelled') {
    const { data } = await supabase
      .from('appointments')
      .select('google_event_id')
      .eq('id', appointmentId)
      .single<{ google_event_id: string | null }>()
    if (data?.google_event_id) {
      try {
        await deleteCalendarEvent(data.google_event_id)
      } catch {
        // best-effort
      }
    }
  }

  await supabase.from('appointments').update({ status }).eq('id', appointmentId)
  revalidatePath('/agenda')
  revalidatePath('/dashboard')
}
