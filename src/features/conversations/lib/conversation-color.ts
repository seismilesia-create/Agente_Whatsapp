import type { ConversationStatus } from '@/shared/types/database'

export type ConversationColor = 'red' | 'yellow' | 'green' | 'blue'

interface ColorInput {
  status: ConversationStatus
  bot_paused: boolean
  needs_human: boolean
}

export interface ColorMeta {
  key: ConversationColor
  label: string
  /** Clase para la barra lateral (border-l-4). */
  barClass: string
  /** Clase para el punto de color. */
  dotClass: string
}

/**
 * Estado de color de una conversación, derivado (no se guarda).
 * Precedencia: cerrada → humano atendiendo → necesita humano → bot OK.
 */
export function conversationColor(c: ColorInput): ConversationColor {
  if (c.status === 'closed') return 'blue'
  if (c.bot_paused && !c.needs_human) return 'yellow'
  if (c.needs_human) return 'red'
  return 'green'
}

export const COLOR_META: Record<ConversationColor, ColorMeta> = {
  red: { key: 'red', label: 'Necesita un humano', barClass: 'border-red-500', dotClass: 'bg-red-500' },
  yellow: { key: 'yellow', label: 'Atendida por humano', barClass: 'border-amber-300', dotClass: 'bg-amber-300' },
  green: { key: 'green', label: 'Bot atendiendo', barClass: 'border-emerald-500', dotClass: 'bg-emerald-500' },
  blue: { key: 'blue', label: 'Cerrada', barClass: 'border-blue-500', dotClass: 'bg-blue-500' },
}

/** Orden de la leyenda, priorizando lo que el personal necesita ver primero. */
export const LEGEND_ORDER: ConversationColor[] = ['red', 'yellow', 'green', 'blue']
