'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { Service, BusinessHour, ScheduleException } from '@/shared/types/database'
import type { CalendarAppointment } from '../services'
import { getRangeAppointmentsAction } from '../actions'
import { resolveDayHours } from '../slots'
import {
  type PlainDate,
  monthGridDays,
  weekDays,
  addMonths,
  addDays,
  monthLabel,
  longDayLabel,
  weekRangeLabel,
  rangeIsoFor,
  weekdaySun0,
} from '../calendar-utils'
import { MonthView } from './month-view'
import { TimeGridView } from './time-grid-view'
import { AppointmentDetailModal } from './appointment-detail-modal'
import { NuevoTurno } from './nuevo-turno'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

type View = 'month' | 'week' | 'day'

interface Props {
  services: Service[]
  initialAppointments: CalendarAppointment[]
  initialCursor: PlainDate
  today: PlainDate
  hours: BusinessHour[]
  exceptions: ScheduleException[]
}

export function AgendaView({ services, initialAppointments, initialCursor, today, hours, exceptions }: Props) {
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<PlainDate>(initialCursor)
  const [appts, setAppts] = useState<CalendarAppointment[]>(initialAppointments)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<CalendarAppointment | null>(null)
  const [prefill, setPrefill] = useState<{ date: PlainDate; minutes?: number } | null>(null)
  const [, startReload] = useTransition()
  const firstRender = useRef(true)

  const days = view === 'month' ? monthGridDays(cursor) : view === 'week' ? weekDays(cursor) : [cursor]

  const reload = () => {
    const { fromIso, toIso } = rangeIsoFor(days)
    startReload(async () => setAppts(await getRangeAppointmentsAction(fromIso, toIso)))
  }
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, view])

  const getDayHours = (d: PlainDate) => {
    const r = resolveDayHours({ date: d, weekday: weekdaySun0(d), weekly: hours, exceptions })
    return { closed: r.closed, ranges: r.hours }
  }
  const isClosed = (d: PlainDate) => getDayHours(d).closed

  const visible = appts.filter((a) => !a.service || !hidden.has(a.service.id))

  const toggleService = (id: string) =>
    setHidden((h) => {
      const n = new Set(h)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const prev = () =>
    setCursor(view === 'month' ? addMonths(cursor, -1) : addDays(cursor, view === 'week' ? -7 : -1))
  const next = () =>
    setCursor(view === 'month' ? addMonths(cursor, 1) : addDays(cursor, view === 'week' ? 7 : 1))

  const title = view === 'month' ? monthLabel(cursor) : view === 'day' ? longDayLabel(cursor) : weekRangeLabel(cursor)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCursor(today)}>
              Hoy
            </Button>
            <Button variant="ghost" size="sm" onClick={prev}>
              ◀
            </Button>
            <Button variant="ghost" size="sm" onClick={next}>
              ▶
            </Button>
            <span className="ml-1 text-sm font-semibold capitalize">{title}</span>
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por servicio */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => {
              const off = hidden.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs transition-opacity',
                    off && 'opacity-40',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Calendario */}
        {view === 'month' ? (
          <MonthView
            cursor={cursor}
            appointments={visible}
            today={today}
            isClosed={isClosed}
            onSelectDay={(d) => {
              setCursor(d)
              setView('day')
              setPrefill({ date: d })
            }}
            onSelectAppt={setSelected}
          />
        ) : (
          <TimeGridView
            days={days}
            appointments={visible}
            today={today}
            getDayHours={getDayHours}
            onSelectAppt={setSelected}
            onCreateAt={(d, minutes) => setPrefill({ date: d, minutes })}
          />
        )}
      </div>

      {/* Panel derecho: nuevo turno */}
      <div className="space-y-4">
        <NuevoTurno services={services} prefill={prefill} />
      </div>

      {selected && (
        <AppointmentDetailModal appt={selected} onClose={() => setSelected(null)} onChanged={reload} />
      )}
    </div>
  )
}
