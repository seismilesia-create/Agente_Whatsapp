'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ContactWithStats } from '../services'
import { deleteContactAction } from '../actions'
import { ContactForm } from './contact-form'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

type Mode = { type: 'list' } | { type: 'new' } | { type: 'edit'; contact: ContactWithStats }

const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso)) : '—'

const fullName = (c: ContactWithStats) => [c.name, c.last_name].filter(Boolean).join(' ') || 'Sin nombre'

export function ContactsManager({ contacts }: { contacts: ContactWithStats[] }) {
  const [mode, setMode] = useState<Mode>({ type: 'list' })
  const [q, setQ] = useState('')
  const [, startTransition] = useTransition()
  const router = useRouter()

  const backToList = () => {
    setMode({ type: 'list' })
    router.refresh()
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return contacts
    return contacts.filter(
      (c) =>
        fullName(c).toLowerCase().includes(s) ||
        c.phone.toLowerCase().includes(s) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(s)),
    )
  }, [q, contacts])

  if (mode.type !== 'list') {
    return <ContactForm contact={mode.type === 'edit' ? mode.contact : undefined} onDone={backToList} />
  }

  const remove = (c: ContactWithStats) => {
    if (!confirm(`¿Eliminar a ${fullName(c)}? Se borra también su historial de conversaciones.`)) return
    startTransition(async () => {
      await deleteContactAction(c.id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, celular o etiqueta…"
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setMode({ type: 'new' })}>
          + Nuevo contacto
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          {contacts.length === 0
            ? 'Todavía no hay contactos. Se cargan solos cuando alguien escribe o saca un turno, o podés crear uno.'
            : 'Sin resultados para tu búsqueda.'}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{fullName(c)}</span>
                  <Badge variant={c.status === 'recurrent' ? 'human' : 'ai'}>
                    {c.status === 'recurrent' ? 'Habitual' : 'Nuevo'}
                  </Badge>
                  {c.marketing_opt_in && <Badge variant="muted">📣 opt-in</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {c.phone}
                  {c.email ? ` · ${c.email}` : ''}
                  {` · ${c.turnos} turno(s) · última: ${fmtDate(c.last_interaction_at)}`}
                </p>
                {c.tags?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setMode({ type: 'edit', contact: c })}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
