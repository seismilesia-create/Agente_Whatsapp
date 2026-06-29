'use client'

import { useActionState, useState } from 'react'
import { upsertContactAction, type ContactState } from '../actions'
import type { Contact } from '@/shared/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

const initial: ContactState = {}

export function ContactForm({ contact, onDone }: { contact?: Contact; onDone: () => void }) {
  const [state, formAction] = useActionState(upsertContactAction, initial)
  const [status, setStatus] = useState<'new' | 'recurrent'>(contact?.status ?? 'new')
  const [optIn, setOptIn] = useState<boolean>(contact?.marketing_opt_in ?? false)
  const [tags, setTags] = useState<string[]>(contact?.tags ?? [])
  const [tagDraft, setTagDraft] = useState('')

  const addTag = () => {
    const t = tagDraft.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagDraft('')
  }
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contact ? 'Editar contacto' : 'Nuevo contacto'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="contactId" value={contact?.id ?? ''} />
          <input type="hidden" name="tags" value={JSON.stringify(tags)} />
          <input type="hidden" name="marketing_opt_in" value={optIn ? 'true' : 'false'} />
          <input type="hidden" name="status" value={status} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" defaultValue={contact?.name ?? ''} placeholder="Juan" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input id="last_name" name="last_name" defaultValue={contact?.last_name ?? ''} placeholder="Pérez" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Celular</Label>
              <Input id="phone" name="phone" defaultValue={contact?.phone ?? ''} placeholder="5493815551234" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ''} placeholder="juan@mail.com" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <Input id="dni" name="dni" defaultValue={contact?.dni ?? ''} placeholder="30123456" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra_social">Obra social</Label>
              <Input id="obra_social" name="obra_social" defaultValue={contact?.obra_social ?? ''} placeholder="OSDE 210 / Particular" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthday">Cumpleaños</Label>
              <Input id="birthday" name="birthday" type="date" defaultValue={contact?.birthday ?? ''} className="max-w-[200px]" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <div className="flex gap-2">
                {([
                  ['new', 'Nuevo'],
                  ['recurrent', 'Habitual'],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setStatus(k)}
                    className={cn(
                      'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                      status === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Pasa a «Habitual» solo al 2º turno; podés ajustarlo a mano.</p>
            </div>
          </div>

          {/* Etiquetas */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-muted-foreground hover:text-foreground">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="ej. OSDE, prefiere mañana, interesado en lifting"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                Agregar
              </Button>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={contact?.notes ?? ''}
              placeholder="Lo que quieras recordar de este cliente."
              className="min-h-[80px]"
            />
          </div>

          {/* Opt-in marketing */}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="h-4 w-4" />
            Acepta recibir promociones / campañas
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit">{contact ? 'Guardar cambios' : 'Crear contacto'}</Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              Volver al listado
            </Button>
            {state.success && <span className="text-sm font-medium text-ai">{state.success}</span>}
            {state.error && <span className="text-sm font-medium text-destructive">{state.error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
