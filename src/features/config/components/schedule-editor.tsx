'use client'

import { useState } from 'react'
import type { BusinessHour, ScheduleException } from '@/shared/types/database'
import type { ArHoliday } from '../ar-holidays'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { TimeField } from '@/shared/components/ui/time-field'
import { cn } from '@/shared/lib/utils'
import type { TimeFormat } from '@/shared/lib/time-format'

type Range = { open: string; close: string }
interface DayState {
  weekday: number
  ranges: Range[]
}
interface SpecialDate {
  kind: 'closed' | 'custom'
  startDate: string
  endDate: string
  ranges: Range[]
  note: string
}
type HolidayKind = 'closed' | 'open' | 'custom'
interface HolidayChoice {
  kind: HolidayKind
  ranges: Range[]
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}
const hhmm = (t: string) => t.slice(0, 5)
const ddmm = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
const DEFAULT_RANGE: Range = { open: '09:00', close: '18:00' }

function initDays(hours: BusinessHour[]): DayState[] {
  return WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    ranges: hours
      .filter((h) => h.weekday === weekday)
      .sort((a, b) => a.open_time.localeCompare(b.open_time))
      .map((h) => ({ open: hhmm(h.open_time), close: hhmm(h.close_time) })),
  }))
}

/** Separa las excepciones guardadas en: confirmaciones de feriados (1 día que cae en feriado) y demás fechas. */
function splitExceptions(exceptions: ScheduleException[], holidayDates: Set<string>) {
  const choices: Record<string, HolidayChoice> = {}
  const specials: SpecialDate[] = []
  for (const e of exceptions) {
    const single = e.start_date === e.end_date
    if (single && holidayDates.has(e.start_date)) {
      choices[e.start_date] = { kind: e.kind, ranges: e.ranges ?? [] }
    } else if (e.kind !== 'open') {
      specials.push({
        kind: e.kind,
        startDate: e.start_date,
        endDate: e.end_date,
        ranges: e.ranges ?? [],
        note: e.note ?? '',
      })
    }
  }
  return { choices, specials }
}

interface Props {
  hours: BusinessHour[]
  exceptions: ScheduleException[]
  holidays: ArHoliday[]
  timeFormat: TimeFormat
}

export function ScheduleEditor({ hours, exceptions, holidays, timeFormat }: Props) {
  const holidayDates = new Set(holidays.map((h) => h.date))
  const initial = splitExceptions(exceptions, holidayDates)
  const [days, setDays] = useState<DayState[]>(() => initDays(hours))
  const [choices, setChoices] = useState<Record<string, HolidayChoice>>(() => initial.choices)
  const [specials, setSpecials] = useState<SpecialDate[]>(() => initial.specials)
  const [format, setFormat] = useState<TimeFormat>(timeFormat)

  // ── horario semanal ──
  const setDayOpen = (wd: number, open: boolean) =>
    setDays((ds) =>
      ds.map((d) =>
        d.weekday === wd
          ? { ...d, ranges: open ? (d.ranges.length ? d.ranges : [{ ...DEFAULT_RANGE }]) : [] }
          : d,
      ),
    )
  const addRange = (wd: number) =>
    setDays((ds) => ds.map((d) => (d.weekday === wd ? { ...d, ranges: [...d.ranges, { ...DEFAULT_RANGE }] } : d)))
  const removeRange = (wd: number, i: number) =>
    setDays((ds) => ds.map((d) => (d.weekday === wd ? { ...d, ranges: d.ranges.filter((_, idx) => idx !== i) } : d)))
  const setRange = (wd: number, i: number, key: keyof Range, value: string) =>
    setDays((ds) =>
      ds.map((d) =>
        d.weekday === wd ? { ...d, ranges: d.ranges.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)) } : d,
      ),
    )

  // ── feriados ──
  const setHoliday = (date: string, kind: HolidayKind) =>
    setChoices((c) => ({
      ...c,
      [date]: {
        kind,
        ranges: kind === 'custom' ? (c[date]?.ranges?.length ? c[date].ranges : [{ ...DEFAULT_RANGE }]) : [],
      },
    }))
  const setHolidayRange = (date: string, key: keyof Range, value: string) =>
    setChoices((c) => ({
      ...c,
      [date]: { ...c[date], ranges: [{ ...(c[date]?.ranges[0] ?? DEFAULT_RANGE), [key]: value }] },
    }))

  // ── fechas especiales ──
  const addSpecial = () =>
    setSpecials((s) => [...s, { kind: 'closed', startDate: '', endDate: '', ranges: [], note: '' }])
  const removeSpecial = (i: number) => setSpecials((s) => s.filter((_, idx) => idx !== i))
  const updateSpecial = (i: number, patch: Partial<SpecialDate>) =>
    setSpecials((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))

  // ── payload serializado para el server action ──
  const hoursPayload = days.flatMap((d) =>
    d.ranges
      .filter((r) => r.open && r.close)
      .map((r) => ({ weekday: d.weekday, open_time: r.open, close_time: r.close })),
  )
  const exceptionsPayload = [
    ...Object.entries(choices).map(([date, c]) => ({
      start_date: date,
      end_date: date,
      kind: c.kind,
      ranges: c.kind === 'custom' ? c.ranges : [],
      note: holidays.find((h) => h.date === date)?.name ?? '',
    })),
    ...specials
      .filter((s) => s.startDate)
      .map((s) => ({
        start_date: s.startDate,
        end_date: s.endDate || s.startDate,
        kind: s.kind,
        ranges: s.kind === 'custom' ? s.ranges : [],
        note: s.note,
      })),
  ]

  return (
    <>
      <input type="hidden" name="business_hours_json" value={JSON.stringify(hoursPayload)} />
      <input type="hidden" name="exceptions_json" value={JSON.stringify(exceptionsPayload)} />
      <input type="hidden" name="time_format" value={format} />

      {/* Horario semanal */}
      <Card>
        <CardHeader>
          <CardTitle>Horarios de atención</CardTitle>
          <CardDescription>
            Los días y horas en que atendés. Podés tener turno mañana y tarde: agregá una franja para el horario partido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Formato de hora:</span>
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
              {(['24h', '12h'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    format === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {f === '24h' ? '24 h' : '12 h'}
                </button>
              ))}
            </div>
          </div>
          {days.map((d) => {
            const open = d.ranges.length > 0
            return (
              <div key={d.weekday} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{WEEKDAY_LABELS[d.weekday]}</span>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={open}
                      onChange={(e) => setDayOpen(d.weekday, e.target.checked)}
                      className="h-4 w-4"
                    />
                    {open ? 'Abierto' : 'Cerrado'}
                  </label>
                </div>
                {open && (
                  <div className="mt-3 space-y-2">
                    {d.ranges.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <TimeField value={r.open} onChange={(v) => setRange(d.weekday, i, 'open', v)} format={format} />
                        <span className="text-muted-foreground">a</span>
                        <TimeField value={r.close} onChange={(v) => setRange(d.weekday, i, 'close', v)} format={format} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRange(d.weekday, i)}>
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addRange(d.weekday)}>
                      + Agregar franja
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Fechas especiales / vacaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Fechas especiales y vacaciones</CardTitle>
          <CardDescription>
            Cerrá un día o un rango (vacaciones), o poné un horario distinto para una fecha puntual. Pisa al horario semanal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {specials.length === 0 && (
            <p className="text-sm text-muted-foreground">No tenés fechas especiales cargadas.</p>
          )}
          {specials.map((s, i) => (
            <div key={i} className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['closed', 'custom'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        updateSpecial(i, {
                          kind: k,
                          ranges: k === 'custom' && s.ranges.length === 0 ? [{ ...DEFAULT_RANGE }] : s.ranges,
                        })
                      }
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm transition-colors',
                        s.kind === k
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      {k === 'closed' ? 'Cerrado' : 'Horario especial'}
                    </button>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeSpecial(i)}>
                  Quitar
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={s.startDate}
                    onChange={(e) => updateSpecial(i, { startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Hasta {s.kind === 'closed' ? '(opcional)' : ''}</Label>
                  <Input
                    type="date"
                    value={s.endDate}
                    onChange={(e) => updateSpecial(i, { endDate: e.target.value })}
                  />
                </div>
              </div>
              {s.kind === 'custom' && (
                <div className="space-y-2">
                  {s.ranges.map((r, ri) => (
                    <div key={ri} className="flex items-center gap-2">
                      <TimeField
                        value={r.open}
                        onChange={(v) =>
                          updateSpecial(i, {
                            ranges: s.ranges.map((x, idx) => (idx === ri ? { ...x, open: v } : x)),
                          })
                        }
                        format={format}
                      />
                      <span className="text-muted-foreground">a</span>
                      <TimeField
                        value={r.close}
                        onChange={(v) =>
                          updateSpecial(i, {
                            ranges: s.ranges.map((x, idx) => (idx === ri ? { ...x, close: v } : x)),
                          })
                        }
                        format={format}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSpecial(i, { ranges: s.ranges.filter((_, idx) => idx !== ri) })}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateSpecial(i, { ranges: [...s.ranges, { ...DEFAULT_RANGE }] })}
                  >
                    + Agregar franja
                  </Button>
                </div>
              )}
              <Input
                placeholder="Nota (opcional, ej. Vacaciones del Dr. García)"
                value={s.note}
                onChange={(e) => updateSpecial(i, { note: e.target.value })}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSpecial}>
            + Agregar fecha especial
          </Button>
        </CardContent>
      </Card>

      {/* Feriados */}
      <Card>
        <CardHeader>
          <CardTitle>Feriados</CardTitle>
          <CardDescription>Confirmá si atendés en los próximos feriados nacionales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {holidays.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay feriados próximos cargados.</p>
          )}
          {holidays.map((h) => {
            const choice = choices[h.date]
            return (
              <div key={h.date} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{ddmm(h.date)}</span> · {h.name}
                  </div>
                  <div className="flex gap-1.5">
                    {(
                      [
                        ['closed', 'Cerrado'],
                        ['open', 'Abierto'],
                        ['custom', 'Especial'],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setHoliday(h.date, k)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-xs transition-colors',
                          choice?.kind === k
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:bg-muted',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {choice?.kind === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <TimeField
                      value={choice.ranges[0]?.open ?? '09:00'}
                      onChange={(v) => setHolidayRange(h.date, 'open', v)}
                      format={format}
                    />
                    <span className="text-muted-foreground">a</span>
                    <TimeField
                      value={choice.ranges[0]?.close ?? '13:00'}
                      onChange={(v) => setHolidayRange(h.date, 'close', v)}
                      format={format}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </>
  )
}
