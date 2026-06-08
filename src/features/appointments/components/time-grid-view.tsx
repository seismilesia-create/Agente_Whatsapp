'use client'

import { type MouseEvent } from 'react'
import type { CalendarAppointment } from '../services'
import {
  type PlainDate,
  arDateOf,
  arMinutesOf,
  arTimeOf,
  dayNumber,
  weekdaySun0,
  WEEKDAY_SHORT,
} from '../calendar-utils'
import { cn } from '@/shared/lib/utils'

interface DayHours {
  closed: boolean
  ranges: { open_time: string; close_time: string }[]
}

interface Props {
  days: PlainDate[]
  appointments: CalendarAppointment[]
  today: PlainDate
  getDayHours: (d: PlainDate) => DayHours
  onSelectAppt: (a: CalendarAppointment) => void
  onCreateAt: (d: PlainDate, minutes: number) => void
}

const HOUR_PX = 56
const toMin = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export function TimeGridView({ days, appointments, today, getDayHours, onSelectAppt, onCreateAt }: Props) {
  // Rango horario visible (a partir de los horarios de atención de los días mostrados).
  let minH = 8 * 60
  let maxH = 20 * 60
  let found = false
  for (const d of days) {
    for (const r of getDayHours(d).ranges) {
      minH = Math.min(minH, toMin(r.open_time))
      maxH = Math.max(maxH, toMin(r.close_time))
      found = true
    }
  }
  const startMin = found ? Math.floor(minH / 60) * 60 : 8 * 60
  const endMin = found ? Math.ceil(maxH / 60) * 60 : 20 * 60
  const gridHeight = (Math.max(endMin - startMin, 60) / 60) * HOUR_PX
  const hours: number[] = []
  for (let h = startMin / 60; h <= endMin / 60; h++) hours.push(h)

  const byDay = new Map<PlainDate, CalendarAppointment[]>()
  for (const a of appointments) {
    const d = arDateOf(a.starts_at)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(a)
  }

  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`

  const onColumnClick = (d: PlainDate, e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    let minutes = startMin + Math.round(((y / HOUR_PX) * 60) / 30) * 30
    minutes = Math.max(startMin, Math.min(endMin - 30, minutes))
    onCreateAt(d, minutes)
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-card">
      {/* Encabezado de días */}
      <div className="sticky top-0 z-10 grid border-b border-border bg-card" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => (
          <div key={d} className="border-l border-border py-2 text-center">
            <div className="text-[11px] uppercase text-muted-foreground">{WEEKDAY_SHORT[(weekdaySun0(d) + 6) % 7]}</div>
            <div
              className={cn(
                'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm',
                d === today && 'bg-primary font-bold text-primary-foreground',
              )}
            >
              {dayNumber(d)}
            </div>
          </div>
        ))}
      </div>

      {/* Grilla */}
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        {/* Gutter de horas */}
        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[11px] text-muted-foreground"
              style={{ top: ((h * 60 - startMin) / 60) * HOUR_PX }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        {days.map((d) => {
          const dh = getDayHours(d)
          const appts = byDay.get(d) ?? []
          return (
            <div
              key={d}
              className="relative cursor-pointer border-l border-border"
              style={{ height: gridHeight }}
              onClick={(e) => onColumnClick(d, e)}
            >
              {dh.closed ? (
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.04)_6px,rgba(0,0,0,0.04)_12px)]" />
              ) : (
                <>
                  <div className="absolute inset-0 bg-muted/30" />
                  {dh.ranges.map((r, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-0 bg-card"
                      style={{
                        top: ((toMin(r.open_time) - startMin) / 60) * HOUR_PX,
                        height: ((toMin(r.close_time) - toMin(r.open_time)) / 60) * HOUR_PX,
                      }}
                    />
                  ))}
                </>
              )}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{ top: ((h * 60 - startMin) / 60) * HOUR_PX }}
                />
              ))}
              {appts.map((a) => {
                const top = ((arMinutesOf(a.starts_at) - startMin) / 60) * HOUR_PX
                const height = Math.max(((a.service?.duration_min ?? 30) / 60) * HOUR_PX, 22)
                const showClient = height >= 42
                const cancelled = a.status === 'cancelled'
                const color = a.service?.color ?? '#6366f1'
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectAppt(a)
                    }}
                    style={{ top, height, backgroundColor: `${color}22`, borderLeftColor: color }}
                    className={cn(
                      'absolute inset-x-0.5 flex flex-col overflow-hidden rounded border-l-[3px] px-1 py-0.5 text-left text-[11px] leading-tight hover:brightness-95',
                      cancelled && 'line-through opacity-60',
                    )}
                  >
                    <span className="truncate font-medium">
                      {arTimeOf(a.starts_at)} {a.service?.name ?? 'Turno'}
                    </span>
                    {showClient && (a.contact?.name || a.contact?.phone) && (
                      <span className="truncate text-muted-foreground">
                        {a.contact?.name || a.contact?.phone}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
