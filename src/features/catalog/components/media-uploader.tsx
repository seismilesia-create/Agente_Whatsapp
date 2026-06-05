'use client'

import { useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addMediaAction, removeMediaAction } from '../actions'
import type { CatalogMedia } from '@/shared/types/database'
import { Button } from '@/shared/components/ui/button'

const BUCKET = 'catalog-media'
const sanitize = (n: string) => n.replace(/[^a-zA-Z0-9.\-_]/g, '_')

export function MediaUploader({
  itemId,
  organizationId,
  media,
}: {
  itemId: string
  organizationId: string
  media: CatalogMedia[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<CatalogMedia[]>(media)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    const supabase = createClient()

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video')
      const path = `${organizationId}/${itemId}/${Date.now()}-${sanitize(file.name)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (upErr) {
        setError(`No se pudo subir ${file.name}`)
        continue
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const res = await addMediaAction({
        itemId,
        url: data.publicUrl,
        path,
        type: isVideo ? 'video' : 'image',
      })
      if (res.error) {
        setError(res.error)
      } else {
        setItems((prev) => [
          ...prev,
          { id: path, organization_id: organizationId, service_id: itemId, url: data.publicUrl, path, type: isVideo ? 'video' : 'image', sort: 0, created_at: '' },
        ])
      }
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (m: CatalogMedia) => {
    setItems((prev) => prev.filter((x) => x.path !== m.path))
    startTransition(() => removeMediaAction(m.id))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {items.map((m) => (
          <div key={m.path} className="relative h-24 w-24 overflow-hidden rounded-md border border-border">
            {m.type === 'video' ? (
              <video src={m.url} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => remove(m)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              aria-label="Quitar"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => onPick(e.target.files)}
      />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? 'Subiendo…' : '+ Subir fotos / videos'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
