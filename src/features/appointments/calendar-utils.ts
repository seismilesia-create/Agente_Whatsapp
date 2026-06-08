import { AR_TZ } from './slots'

/** Utilidades de fechas para el calendario de la Agenda. Trabaja con 'YYYY-MM-DD' (PlainDate). */
export type PlainDate = string

const pad = (n: number) => String(n).padStart(2, '0')
const parts = (d: PlainDate): [number, number, number] => {
  const [y, m, day] = d.split('-').map(Number)
  return [y, m, day]
}

export function addDays(d: PlainDate, n: number): PlainDate {
  const [y, m, day] = parts(d)
  const dt = new Date(Date.UTC(y, m - 1, day) + n * 86_400_000)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function addMonths(d: PlainDate, n: number): PlainDate {
  const [y, m, day] = parts(d)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = total % 12
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(day, lastDay))}`
}

/** 0=domingo … 6=sábado (para cruzar con business_hours.weekday). */
export function weekdaySun0(d: PlainDate): number {
  const [y, m, day] = parts(d)
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay()
}

/** 0=lunes … 6=domingo (para la grilla, que arranca en lunes). */
export function weekdayMon0(d: PlainDate): number {
  return (weekdaySun0(d) + 6) % 7
}

export function startOfWeek(d: PlainDate): PlainDate {
  return addDays(d, -weekdayMon0(d))
}

/** 42 días (6 semanas, lunes→domingo) que cubren el mes del día dado. */
export function monthGridDays(d: PlainDate): PlainDate[] {
  const [y, m] = parts(d)
  const start = startOfWeek(`${y}-${pad(m)}-01`)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function weekDays(d: PlainDate): PlainDate[] {
  const start = startOfWeek(d)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function sameMonth(a: PlainDate, b: PlainDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function monthLabel(d: PlainDate): string {
  const [y, m] = parts(d)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function dayNumber(d: PlainDate): number {
  return parts(d)[2]
}

/** Etiqueta de rango de semana: "8 jun – 14 jun". */
export function weekRangeLabel(d: PlainDate): string {
  const w = weekDays(d)
  const fmt = (x: PlainDate) =>
    new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: AR_TZ }).format(
      new Date(`${x}T12:00:00-03:00`),
    )
  return `${fmt(w[0])} – ${fmt(w[6])}`
}

/** Etiqueta larga de un día: "Lunes 8 de junio". */
export function longDayLabel(d: PlainDate): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: AR_TZ,
  }).format(new Date(`${d}T12:00:00-03:00`))
}

// ── Conversión instante ISO (UTC) → hora local Argentina ──

export function arDateOf(iso: string): PlainDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ }).format(new Date(iso))
}

export function arTimeOf(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: AR_TZ,
  }).format(new Date(iso))
}

/** Minutos desde la medianoche (hora AR) del instante dado. */
export function arMinutesOf(iso: string): number {
  const [h, m] = arTimeOf(iso).split(':').map(Number)
  return h * 60 + m
}

export function todayAR(): PlainDate {
  return arDateOf(new Date().toISOString())
}

/** Rango ISO [desde, hasta] que cubre una lista de días locales AR (para consultar turnos). */
export function rangeIsoFor(days: PlainDate[]): { fromIso: string; toIso: string } {
  const first = days[0]
  const last = days[days.length - 1]
  return {
    fromIso: new Date(`${first}T00:00:00-03:00`).toISOString(),
    toIso: new Date(`${last}T23:59:59-03:00`).toISOString(),
  }
}

/** Construye un instante ISO a partir de un día AR + minutos desde medianoche. */
export function isoFromDayMinutes(day: PlainDate, minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return new Date(`${day}T${pad(h)}:${pad(m)}:00-03:00`).toISOString()
}
