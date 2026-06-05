import { createClient } from '@/lib/supabase/server'
import type { CatalogItemWithMedia } from '@/shared/types/database'

/** Todos los ítems del catálogo (productos + servicios) con su media. */
export async function getCatalogItems(): Promise<CatalogItemWithMedia[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('services')
    .select('*, media:catalog_media(*)')
    .order('kind')
    .order('name')
  return (data as CatalogItemWithMedia[]) ?? []
}

export async function getCatalogItem(id: string): Promise<CatalogItemWithMedia | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('services')
    .select('*, media:catalog_media(*)')
    .eq('id', id)
    .single<CatalogItemWithMedia>()
  return data
}
