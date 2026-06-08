'use client'

import { useTransition } from 'react'
import type { UpcomingAppointment } from '../services'
import { setAppointmentStatusAction } from '../actions'
import type { AppointmentStatus } from '@/shared/types/database'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: 'Reservado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
  no_show: 'No asistió',
}

const STATUS_VARIANT: Record<AppointmentStatus, 'default' | 'ai' | 'human' | 'contact' | 'muted'> = {
  booked: 'human',
  confirmed: 'ai',
  cancelled: 'muted',
  completed: 'ai',
  no_show: 'muted',
}

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso))

function Row({ appt }: { appt: UpcomingAppointment }) {
  const [pending, start] = useTransition()
  const set = (status: AppointmentStatus) => start(() => setAppointmentStatusAction(appt.id, status))

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-medium capitalize">{fmt(appt.starts_at)}</p>
        <p className="text-sm text-muted-foreground">
          {appt.service?.name ?? 'Servicio'} · {appt.contact?.name || appt.contact?.phone || 'Sin contacto'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
        {appt.status !== 'completed' && appt.status !== 'cancelled' && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => set('completed')}>
              ✓
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => set('no_show')}>
              No asistió
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => set('cancelled')}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

export function AppointmentList({ appointments }: { appointments: UpcomingAppointment[] }) {
  if (appointments.length === 0) {
    return (
      <Card className="border-dashed bg-muted/40 p-10 text-center text-sm text-muted-foreground">
        No hay turnos próximos. Reservá uno con «Nuevo turno» o dejá que el agente los agende.
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      {appointments.map((a) => (
        <Row key={a.id} appt={a} />
      ))}
    </div>
  )
}
