'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/shared/lib/get-session'
import { catalogItemSchema } from './schemas'
import type { CatalogAttribute, MediaType } from '@/shared/types/database'

export interface CatalogState {
  error?: string
  success?: string
  itemId?: string
}

function parseAttributes(raw: FormDataEntryValue | null): CatalogAttribute[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(String(raw))
    if (!Array.isArray(arr)) return []
    return arr.filter((a) => a?.label && a?.value)
  } catch {
    return []
  }
}

/** Crea o actualiza un ítem del catálogo. Si viene `itemId`, actualiza. */
export async function upsertItemAction(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Sesión expirada' }

  const kind = String(formData.get('kind') ?? 'service')
  const stockRaw = formData.get('stock')
  const parsed = catalogItemSchema.safeParse({
    kind,
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    price: formData.get('price') ?? 0,
    duration_min: formData.get('duration_min') ?? 30,
    stock: kind === 'product' && stockRaw !== null && stockRaw !== '' ? stockRaw : null,
    attributes: parseAttributes(formData.get('attributes')),
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const itemId = String(formData.get('itemId') ?? '')
  const payload = {
    organization_id: ctx.organization.id,
    kind: parsed.data.kind,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    duration_min: parsed.data.duration_min,
    stock: parsed.data.stock,
    attributes: parsed.data.attributes,
    active: parsed.data.active,
  }

  let resultId = itemId
  if (itemId) {
    const { error } = await supabase.from('services').update(payload).eq('id', itemId)
    if (error) return { error: 'No se pudo guardar el ítem' }
  } else {
    const { data, error } = await supabase.from('services').insert(payload).select('id').single<{ id: string }>()
    if (error || !data) return { error: 'No se pudo crear el ítem' }
    resultId = data.id
  }

  revalidatePath('/catalogo')
  revalidatePath('/agenda')
  return { success: 'Ítem guardado ✓', itemId: resultId }
}

export async function deleteItemAction(itemId: string): Promise<void> {
  const supabase = await createClient()
  // Borrar archivos del storage asociados antes de borrar el ítem
  const { data: media } = await supabase.from('catalog_media').select('path').eq('service_id', itemId)
  if (media && media.length > 0) {
    await supabase.storage.from('catalog-media').remove(media.map((m) => m.path as string))
  }
  await supabase.from('services').delete().eq('id', itemId)
  revalidatePath('/catalogo')
  revalidatePath('/agenda')
}

/** Registra un archivo ya subido a Storage como media de un ítem. */
export async function addMediaAction(params: {
  itemId: string
  url: string
  path: string
  type: MediaType
}): Promise<CatalogState> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Sesión expirada' }
  const supabase = await createClient()
  const { error } = await supabase.from('catalog_media').insert({
    organization_id: ctx.organization.id,
    service_id: params.itemId,
    url: params.url,
    path: params.path,
    type: params.type,
  })
  if (error) return { error: 'No se pudo registrar el archivo' }
  revalidatePath('/catalogo')
  return { success: 'Archivo agregado ✓' }
}

export async function removeMediaAction(mediaId: string): Promise<void> {
  const supabase = await createClient()
  const { data: media } = await supabase
    .from('catalog_media')
    .select('path')
    .eq('id', mediaId)
    .single<{ path: string }>()
  if (media?.path) {
    await supabase.storage.from('catalog-media').remove([media.path])
  }
  await supabase.from('catalog_media').delete().eq('id', mediaId)
  revalidatePath('/catalogo')
}
