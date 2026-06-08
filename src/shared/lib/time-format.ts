export type TimeFormat = '12h' | '24h'

/** Formatea una hora 'HH:MM' (o 'HH:MM:SS') para mostrar según el formato elegido. */
export function formatTime(value: string, format: TimeFormat): string {
  const [hhRaw, mmRaw] = (value || '').slice(0, 5).split(':')
  const h = parseInt(hhRaw, 10)
  const m = mmRaw ?? '00'
  if (Number.isNaN(h)) return value
  if (format === '12h') {
    const period = h >= 12 ? 'p.m.' : 'a.m.'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${m} ${period}`
  }
  return `${String(h).padStart(2, '0')}:${m}`
}
