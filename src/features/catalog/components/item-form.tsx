'use client'

import { useActionState, useState } from 'react'
import { upsertItemAction, type CatalogState } from '../actions'
import type { CatalogItemWithMedia, CatalogAttribute, CatalogKind } from '@/shared/types/database'
import { MediaUploader } from './media-uploader'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

const initial: CatalogState = {}

interface Props {
  organizationId: string
  item?: CatalogItemWithMedia
  onDone: () => void
}

export function ItemForm({ organizationId, item, onDone }: Props) {
  const [state, formAction] = useActionState(upsertItemAction, initial)
  const [kind, setKind] = useState<CatalogKind>(item?.kind ?? 'service')
  const [attrs, setAttrs] = useState<CatalogAttribute[]>(item?.attributes ?? [])
  const [active, setActive] = useState<boolean>(item?.active ?? true)

  // tras crear/guardar, si era nuevo ahora hay itemId → permite subir media
  const savedId = state.itemId ?? item?.id ?? ''

  const addAttr = () => setAttrs((a) => [...a, { label: '', value: '' }])
  const setAttr = (i: number, k: keyof CatalogAttribute, v: string) =>
    setAttrs((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)))
  const delAttr = (i: number) => setAttrs((a) => a.filter((_, idx) => idx !== i))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item ? 'Editar ítem' : 'Nuevo ítem'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="itemId" value={item?.id ?? state.itemId ?? ''} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="attributes" value={JSON.stringify(attrs)} />
          <input type="hidden" name="active" value={active ? 'true' : 'false'} />

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(['service', 'product'] as CatalogKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                    kind === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
                  )}
                >
                  {k === 'service' ? '🛠️ Servicio' : '📦 Producto'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" defaultValue={item?.name} placeholder={kind === 'product' ? 'Shampoo profesional' : 'Corte de pelo'} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Precio (ARS)</Label>
              <Input id="price" name="price" type="number" min={0} defaultValue={item?.price ?? 0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" defaultValue={item?.description} placeholder="Detalle del producto o servicio que el agente usará para responder." />
          </div>

          {/* Campos según tipo */}
          {kind === 'service' ? (
            <div className="space-y-2">
              <Label htmlFor="duration_min">Duración (min) — para turnos</Label>
              <Input id="duration_min" name="duration_min" type="number" min={0} max={480} defaultValue={item?.duration_min ?? 30} className="max-w-[160px]" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="stock">Stock (unidades)</Label>
              <Input id="stock" name="stock" type="number" min={0} defaultValue={item?.stock ?? 0} className="max-w-[160px]" />
            </div>
          )}

          {/* Características flexibles */}
          <div className="space-y-2">
            <Label>Características</Label>
            {attrs.length === 0 && <p className="text-sm text-muted-foreground">Agregá características relevantes (ej. Color, Talle, Incluye…).</p>}
            <div className="space-y-2">
              {attrs.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Característica" value={a.label} onChange={(e) => setAttr(i, 'label', e.target.value)} className="max-w-[40%]" />
                  <Input placeholder="Valor" value={a.value} onChange={(e) => setAttr(i, 'value', e.target.value)} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => delAttr(i)}>×</Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addAttr}>+ Agregar característica</Button>
          </div>

          {/* Disponible */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
            Disponible (visible para el agente)
          </label>

          {/* Media */}
          <div className="space-y-2">
            <Label>Fotos y videos</Label>
            {savedId ? (
              <MediaUploader itemId={savedId} organizationId={organizationId} media={item?.media ?? []} />
            ) : (
              <p className="text-sm text-muted-foreground">Guardá el ítem primero y vas a poder subir fotos y videos.</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit">{item || state.itemId ? 'Guardar cambios' : 'Crear ítem'}</Button>
            <Button type="button" variant="ghost" onClick={onDone}>Volver al listado</Button>
            {state.success && <span className="text-sm font-medium text-ai">{state.success}</span>}
            {state.error && <span className="text-sm font-medium text-destructive">{state.error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
