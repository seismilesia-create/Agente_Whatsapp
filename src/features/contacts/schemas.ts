import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre'),
  last_name: z.string().trim().optional().default(''),
  phone: z.string().trim().min(6, 'Ingresá un celular válido'),
  email: z.union([z.string().trim().email('Email inválido'), z.literal('')]).optional().default(''),
  birthday: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'), z.literal('')]).optional().default(''),
  notes: z.string().trim().optional().default(''),
  tags: z.array(z.string().trim().min(1)).default([]),
  marketing_opt_in: z.boolean().default(false),
  status: z.enum(['new', 'recurrent']).default('new'),
})

export type ContactInput = z.infer<typeof contactSchema>
