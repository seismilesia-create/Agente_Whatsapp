'use client'

import { useTransition } from 'react'
import type { CalendarAppointment } from '../services'
import { setAppointmentStatusAction } from '../actions'
import type { AppointmentStatus } from '@/shared/types/database'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { longDayLabel, arDateOf, arTimeOf } from '../calendar-utils'

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: 'Reservado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
  no_show: 'No asistió',
}

interface Props {
  appt: CalendarAppointment
  onClose: () => void
  onChanged: () => void
}

export function AppointmentDetailModal({ appt, onClose, onChanged }: Props) {
  const [pending, start] = useTransition()
  const set = (status: AppointmentStatus) =>
    start(async () => {
      await setAppointmentStatusAction(appt.id, status)
      onChanged()
      onClose()
    })
  const openActions = appt.status !== 'completed' && appt.status !== 'cancelled'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: appt.service?.color ?? '#6366f1' }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{appt.service?.name ?? 'Turno'}</h3>
            <p className="text-sm capitalize text-muted-foreground">
              {longDayLabel(arDateOf(appt.starts_at))} · {arTimeOf(appt.starts_at)} hs
            </p>
          </div>
          <Badge variant="muted">{STATUS_LABEL[appt.status]}</Badge>
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Cliente:</span> {appt.contact?.name || '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Teléfono:</span> {appt.contact?.phone || '—'}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {openActions && (
            <>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => set('completed')}>
                ✓ Completado
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => set('no_show')}>
                No asistió
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => set('cancelled')}>
                Cancelar turno
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
