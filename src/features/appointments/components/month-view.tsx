'use client'

import type { CalendarAppointment } from '../services'
import {
  type PlainDate,
  monthGridDays,
  weekdayMon0,
  sameMonth,
  arDateOf,
  arTimeOf,
  dayNumber,
  WEEKDAY_SHORT,
} from '../calendar-utils'
import { cn } from '@/shared/lib/utils'

interface Props {
  cursor: PlainDate
  appointments: CalendarAppointment[]
  today: PlainDate
  isClosed: (d: PlainDate) => boolean
  onSelectDay: (d: PlainDate) => void
  onSelectAppt: (a: CalendarAppointment) => void
}

const MAX_CHIPS = 3

export function MonthView({ cursor, appointments, today, isClosed, onSelectDay, onSelectAppt }: Props) {
  const days = monthGridDays(cursor)

  const byDay = new Map<PlainDate, CalendarAppointment[]>()
  for (const a of appointments) {
    const d = arDateOf(a.starts_at)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(a)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
        {WEEKDAY_SHORT.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = sameMonth(d, cursor)
          const closed = isClosed(d)
          const isToday = d === today
          const appts = byDay.get(d) ?? []
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDay(d)}
              className={cn(
                'flex min-h-[96px] flex-col gap-1 border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-muted/40',
                weekdayMon0(d) === 6 && 'border-r-0',
                !inMonth && 'bg-muted/20',
                closed && inMonth && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.04)_6px,rgba(0,0,0,0.04)_12px)]',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center self-start rounded-full text-xs',
                  isToday ? 'bg-primary font-bold text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {dayNumber(d)}
              </span>
              <div className="flex flex-col gap-0.5">
                {appts.slice(0, MAX_CHIPS).map((a) => {
                  const cancelled = a.status === 'cancelled'
                  return (
                    <span
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectAppt(a)
                      }}
                      style={{ borderLeftColor: a.service?.color ?? '#6366f1' }}
                      className={cn(
                        'truncate rounded-sm border-l-[3px] bg-muted/60 px-1 py-0.5 text-[11px] leading-tight hover:bg-muted',
                        cancelled && 'text-muted-foreground line-through',
                      )}
                    >
                      {arTimeOf(a.starts_at)} {a.service?.name ?? 'Turno'}
                    </span>
                  )
                })}
                {appts.length > MAX_CHIPS && (
                  <span className="px-1 text-[11px] font-medium text-muted-foreground">+{appts.length - MAX_CHIPS} más</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
