'use client'

import { cn } from '@/shared/lib/utils'
import type { TimeFormat } from '@/shared/lib/time-format'

/**
 * Selector de hora que respeta el formato 12 h / 24 h elegido.
 * Reemplaza al <input type="time"> nativo (cuyo formato depende del navegador y no
 * se puede forzar). Internamente trabaja siempre con 'HH:MM' (24 h).
 */

const pad = (n: number) => String(n).padStart(2, '0')
const MINUTES: number[] = []
for (let i = 0; i < 60; i += 5) MINUTES.push(i)

const SELECT_CLS =
  'rounded-md border border-input bg-card px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

interface TimeFieldProps {
  value: string // 'HH:MM' (24 h, canónico)
  onChange: (value: string) => void
  format: TimeFormat
  className?: string
}

export function TimeField({ value, onChange, format, className }: TimeFieldProps) {
  const [hhRaw, mmRaw] = (value || '09:00').split(':')
  const h = Math.min(23, Math.max(0, parseInt(hhRaw, 10) || 0))
  const m = Math.min(59, Math.max(0, parseInt(mmRaw, 10) || 0))
  // Garantizar que el minuto actual sea seleccionable aunque no caiga en el paso de 5.
  const minutes = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort((a, b) => a - b)

  const emit = (nh: number, nm: number) => onChange(`${pad(nh)}:${pad(nm)}`)

  const minuteSelect = (
    <select className={SELECT_CLS} value={m} onChange={(e) => emit(h, Number(e.target.value))} aria-label="Minutos">
      {minutes.map((min) => (
        <option key={min} value={min}>
          {pad(min)}
        </option>
      ))}
    </select>
  )

  if (format === '12h') {
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    const to24 = (hour12: number, per: 'AM' | 'PM') =>
      per === 'AM' ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <select
          className={SELECT_CLS}
          value={h12}
          onChange={(e) => emit(to24(Number(e.target.value), period), m)}
          aria-label="Hora"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((hr) => (
            <option key={hr} value={hr}>
              {hr}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground">:</span>
        {minuteSelect}
        <select
          className={SELECT_CLS}
          value={period}
          onChange={(e) => emit(to24(h12, e.target.value as 'AM' | 'PM'), m)}
          aria-label="AM o PM"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <select className={SELECT_CLS} value={h} onChange={(e) => emit(Number(e.target.value), m)} aria-label="Hora">
        {Array.from({ length: 24 }, (_, i) => i).map((hr) => (
          <option key={hr} value={hr}>
            {pad(hr)}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      {minuteSelect}
    </div>
  )
}
