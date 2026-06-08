/**
 * Feriados nacionales de Argentina (fechas observadas, con traslados aplicados).
 *
 * Reglas usadas:
 * - Inamovibles: quedan en su fecha (Año Nuevo, Memoria 24/3, Malvinas 2/4, Trabajador 1/5,
 *   Revolución 25/5, Bandera 20/6, Independencia 9/7, Inmaculada 8/12, Navidad 25/12).
 * - Trasladables (Güemes 17/6, Diversidad 12/10, Soberanía 20/11): si caen martes/miércoles
 *   se mueven al lunes anterior; jueves/viernes, al lunes siguiente (Decreto 1584/2010).
 * - San Martín: tercer lunes de agosto. Carnaval y Viernes Santo: según Pascua.
 *
 * NO incluye "días no laborables con fines turísticos" (puentes), que el PEN fija por decreto
 * cada año. Revisar/actualizar esta lista anualmente.
 */
export interface ArHoliday {
  date: string // 'YYYY-MM-DD'
  name: string
}

export const AR_HOLIDAYS: ArHoliday[] = [
  // ── 2026 ──
  { date: '2026-01-01', name: 'Año Nuevo' },
  { date: '2026-02-16', name: 'Carnaval' },
  { date: '2026-02-17', name: 'Carnaval' },
  { date: '2026-03-24', name: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { date: '2026-04-02', name: 'Día del Veterano y de los Caídos en Malvinas' },
  { date: '2026-04-03', name: 'Viernes Santo' },
  { date: '2026-05-01', name: 'Día del Trabajador' },
  { date: '2026-05-25', name: 'Día de la Revolución de Mayo' },
  { date: '2026-06-15', name: 'Paso a la Inmortalidad del Gral. Güemes' }, // trasladado del 17
  { date: '2026-06-20', name: 'Paso a la Inmortalidad del Gral. Belgrano (Día de la Bandera)' },
  { date: '2026-07-09', name: 'Día de la Independencia' },
  { date: '2026-08-17', name: 'Paso a la Inmortalidad del Gral. San Martín' },
  { date: '2026-10-12', name: 'Día del Respeto a la Diversidad Cultural' },
  { date: '2026-11-23', name: 'Día de la Soberanía Nacional' }, // trasladado del 20
  { date: '2026-12-08', name: 'Inmaculada Concepción de María' },
  { date: '2026-12-25', name: 'Navidad' },

  // ── 2027 ──
  { date: '2027-01-01', name: 'Año Nuevo' },
  { date: '2027-02-08', name: 'Carnaval' },
  { date: '2027-02-09', name: 'Carnaval' },
  { date: '2027-03-24', name: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { date: '2027-03-26', name: 'Viernes Santo' },
  { date: '2027-04-02', name: 'Día del Veterano y de los Caídos en Malvinas' },
  { date: '2027-05-01', name: 'Día del Trabajador' },
  { date: '2027-05-25', name: 'Día de la Revolución de Mayo' },
  { date: '2027-06-21', name: 'Paso a la Inmortalidad del Gral. Güemes' }, // trasladado del 17
  { date: '2027-06-20', name: 'Paso a la Inmortalidad del Gral. Belgrano (Día de la Bandera)' },
  { date: '2027-07-09', name: 'Día de la Independencia' },
  { date: '2027-08-16', name: 'Paso a la Inmortalidad del Gral. San Martín' },
  { date: '2027-10-11', name: 'Día del Respeto a la Diversidad Cultural' }, // trasladado del 12
  { date: '2027-11-20', name: 'Día de la Soberanía Nacional' },
  { date: '2027-12-08', name: 'Inmaculada Concepción de María' },
  { date: '2027-12-25', name: 'Navidad' },
]

/** Próximos feriados desde `fromDate` (inclusive), ordenados, hasta `limit`. */
export function upcomingHolidays(fromDate: string, limit = 12): ArHoliday[] {
  return AR_HOLIDAYS.filter((h) => h.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}
