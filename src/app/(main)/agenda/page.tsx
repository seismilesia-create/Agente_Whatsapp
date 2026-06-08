import {
  getServices,
  getBusinessHours,
  getScheduleExceptions,
  getAppointmentsInRange,
} from '@/features/appointments/services'
import { AgendaView } from '@/features/appointments/components/agenda-view'
import { monthGridDays, rangeIsoFor, todayAR } from '@/features/appointments/calendar-utils'

export default async function AgendaPage() {
  const today = todayAR()
  const { fromIso, toIso } = rangeIsoFor(monthGridDays(today))

  const [services, hours, exceptions, appointments] = await Promise.all([
    getServices(),
    getBusinessHours(),
    getScheduleExceptions(),
    getAppointmentsInRange(fromIso, toIso),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Calendario de turnos. Click en un día para ver el detalle; click en un hueco para cargar un turno.
        </p>
      </div>
      <AgendaView
        services={services}
        initialAppointments={appointments}
        initialCursor={today}
        today={today}
        hours={hours}
        exceptions={exceptions}
      />
    </div>
  )
}
