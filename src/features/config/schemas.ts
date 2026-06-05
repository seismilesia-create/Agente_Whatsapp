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
  default_service_duration_min: z.coerce.number().int().min(5).max(480).default(30),
})

export type BusinessConfigInput = z.infer<typeof businessConfigSchema>
