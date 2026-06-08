import { z } from 'zod'

export const faqSchema = z.object({
  q: z.string().min(1, 'Ingresá la pregunta'),
  a: z.string().min(1, 'Ingresá la respuesta'),
})

export const businessConfigSchema = z.object({
  agent_name: z.string().min(1, 'El agente necesita un nombre'),
  system_prompt: z.string().min(10, 'Describí el rol y reglas del agente (mín. 10 caracteres)'),
  tone: z.string().min(1, 'Definí el tono de voz'),
  business_name: z.string().optional().default(''),
  address: z.string().optional().default(''),
  faqs: z.array(faqSchema).default([]),
  greeting_message: z.string().min(1, 'Ingresá el saludo inicial'),
  handoff_message: z.string().min(1, 'Ingresá el mensaje de transferencia a humano'),
})

export type BusinessConfigInput = z.infer<typeof businessConfigSchema>

const hoursRangeSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
})

export const businessHourRowSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  open_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  close_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
})

export const scheduleExceptionRowSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  kind: z.enum(['closed', 'custom', 'open']),
  ranges: z.array(hoursRangeSchema).default([]),
  note: z.string().optional().default(''),
})

export type BusinessHourRow = z.infer<typeof businessHourRowSchema>
export type ScheduleExceptionRow = z.infer<typeof scheduleExceptionRowSchema>
