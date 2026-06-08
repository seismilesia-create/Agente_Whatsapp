'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import type { Service } from '@/shared/types/database'
import { getSlotsAction, bookAppointmentAction, type BookState } from '../actions'
import type { DayAvailability } from '../services'
import { arMinutesOf } from '../calendar-utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

const initial: BookState = {}

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(`${date}T12:00:00-03:00`))

export function NuevoTurno({
  services,
  prefill,
}: {
  services: Service[]
  prefill?: { date: string; minutes?: number } | null
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [slot, setSlot] = useState<string>('')
  const [loading, startLoading] = useTransition()
  const [state, formAction] = useActionState(bookAppointmentAction, initial)

  useEffect(() => {
    if (!serviceId) return
    setSlot('')
    startLoading(async () => {
      setAvailability(await getSlotsAction(serviceId))
    })
  }, [serviceId])

  // Click en el calendario → pre-selecciona el día/horario más cercano disponible.
  useEffect(() => {
    if (!prefill || availability.length === 0) return
    const day = availability.find((d) => d.date === prefill.date)
    if (!day || day.slots.length === 0) return
    let chosen = day.slots[0]
    if (prefill.minutes != null) {
      const target = prefill.minutes
      chosen = day.slots.reduce(
        (best, s) =>
          Math.abs(arMinutesOf(s.startsAt) - target) < Math.abs(arMinutesOf(best.startsAt) - target) ? s : best,
        day.slots[0],
      )
    }
    setSlot(chosen.startsAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, availability])

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Primero aplicá una plantilla de rubro para cargar servicios y horarios.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo turno</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="startsAt" value={slot} />

          <div className="space-y-2">
            <Label>Servicio</Label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_min} min
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Horario disponible</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Calculando disponibilidad…</p>
            ) : availability.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay horarios en los próximos días.</p>
            ) : (
              <div className="max-h-56 space-y-3 overflow-auto rounded-md border border-border p-3">
                {availability.map((day) => (
                  <div key={day.date}>
                    <p className="mb-1 text-xs font-semibold capitalize text-muted-foreground">{dayLabel(day.date)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {day.slots.map((s) => (
                        <button
                          key={s.startsAt}
                          type="button"
                          onClick={() => setSlot(s.startsAt)}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-xs transition-colors',
                            slot === s.startsAt
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:bg-muted',
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactName">Nombre del cliente</Label>
              <Input id="contactName" name="contactName" placeholder="Juana Pérez" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Teléfono</Label>
              <Input id="contactPhone" name="contactPhone" placeholder="+54 9 383…" required />
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm font-medium text-ai">{state.success}</p>}

          <Button type="submit" disabled={!slot}>
            Reservar turno
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
