import { z } from 'zod'

export const catalogAttributeSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
})

export const catalogItemSchema = z.object({
  kind: z.enum(['service', 'product']),
  name: z.string().min(1, 'Ingresá el nombre'),
  description: z.string().optional().default(''),
  price: z.coerce.number().min(0).default(0),
  duration_min: z.coerce.number().int().min(0).max(480).default(30),
  stock: z.union([z.coerce.number().int().min(0), z.null()]).default(null),
  attributes: z.array(catalogAttributeSchema).default([]),
  active: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido').default('#6366f1'),
})

export type CatalogItemInput = z.infer<typeof catalogItemSchema>
