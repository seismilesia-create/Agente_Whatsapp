/** Paleta de colores para servicios (se usan en el calendario de la Agenda). */
export interface ServiceColor {
  name: string
  hex: string
}

export const SERVICE_COLORS: ServiceColor[] = [
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Celeste', hex: '#38bdf8' },
  { name: 'Azul', hex: '#6366f1' },
  { name: 'Violeta', hex: '#a855f7' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Naranja', hex: '#f97316' },
  { name: 'Amarillo', hex: '#eab308' },
  { name: 'Rojo', hex: '#ef4444' },
  { name: 'Gris', hex: '#64748b' },
]

export const DEFAULT_SERVICE_COLOR = '#6366f1'
