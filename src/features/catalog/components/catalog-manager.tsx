'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CatalogItemWithMedia } from '@/shared/types/database'
import { deleteItemAction } from '../actions'
import { ItemForm } from './item-form'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

type Mode = { type: 'list' } | { type: 'new' } | { type: 'edit'; item: CatalogItemWithMedia }

export function CatalogManager({
  items,
  organizationId,
}: {
  items: CatalogItemWithMedia[]
  organizationId: string
}) {
  const [mode, setMode] = useState<Mode>({ type: 'list' })
  const [, startTransition] = useTransition()
  const router = useRouter()

  const backToList = () => {
    setMode({ type: 'list' })
    router.refresh()
  }

  if (mode.type !== 'list') {
    return (
      <ItemForm
        organizationId={organizationId}
        item={mode.type === 'edit' ? mode.item : undefined}
        onDone={backToList}
      />
    )
  }

  const remove = (id: string) => {
    if (!confirm('¿Eliminar este ítem y sus fotos/videos?')) return
    startTransition(async () => {
      await deleteItemAction(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} ítem(s) en el catálogo</p>
        <Button size="sm" onClick={() => setMode({ type: 'new' })}>+ Nuevo ítem</Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          Todavía no cargaste productos ni servicios. Empezá con «Nuevo ítem».
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const cover = item.media?.[0]
            return (
              <Card key={item.id} className="flex gap-3 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {cover ? (
                    cover.type === 'video' ? (
                      <video src={cover.url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt="" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      {item.kind === 'product' ? '📦' : '🛠️'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.name}</span>
                    <Badge variant={item.kind === 'product' ? 'default' : 'ai'}>
                      {item.kind === 'product' ? 'Producto' : 'Servicio'}
                    </Badge>
                    {!item.active && <Badge variant="muted">Oculto</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {money(item.price)}
                    {item.kind === 'service' ? ` · ${item.duration_min} min` : item.stock != null ? ` · stock ${item.stock}` : ''}
                    {item.media?.length ? ` · ${item.media.length} archivo(s)` : ''}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setMode({ type: 'edit', item })}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>Eliminar</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
