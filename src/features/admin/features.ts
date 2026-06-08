/** Catálogo de features/add-ons que el super-admin habilita por cliente. */
export interface FeatureDef {
  key: string
  label: string
  description: string
  /** Si la maquinaria de la feature todavía no está construida (el toggle se guarda igual). */
  comingSoon?: boolean
}

export const FEATURES: FeatureDef[] = [
  {
    key: 'appointment_confirmation',
    label: 'Confirmación de turno',
    description: 'Recordatorio automático antes del turno para que el cliente confirme.',
  },
  {
    key: 'google_calendar',
    label: 'Google Calendar',
    description: 'Espeja los turnos en un Google Calendar compartido.',
    comingSoon: true,
  },
]
