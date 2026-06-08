'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ConversationDetail } from '../services'
import { sendHumanMessageAction, toggleBotPausedAction, type SendState } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'

const initial: SendState = {}

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const fullName = (c: ConversationDetail['contact']) =>
  [c?.name, c?.last_name].filter(Boolean).join(' ') || c?.phone || 'Sin nombre'

export function ConversationThread({ conversation }: { conversation: ConversationDetail }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(sendHumanMessageAction, initial)
  const formRef = useRef<HTMLFormElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Auto-refresh para traer mensajes nuevos del cliente o del bot.
  useEffect(() => {
    const i = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(i)
  }, [router])

  // Scroll al último mensaje cuando llega uno nuevo.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages.length])

  const setPaused = (paused: boolean) => {
    void toggleBotPausedAction(conversation.id, paused).then(() => router.refresh())
  }

  return (
    <div className="flex h-full flex-col">
      {/* Encabezado + control del bot */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{fullName(conversation.contact)}</p>
          <p className="truncate text-xs text-muted-foreground">{conversation.contact?.phone}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {conversation.bot_paused ? (
            <>
              <span className="rounded-full bg-human/10 px-2 py-0.5 text-xs font-semibold text-human">Atendés vos</span>
              <Button size="sm" variant="outline" onClick={() => setPaused(false)}>
                Reactivar bot
              </Button>
            </>
          ) : (
            <>
              <span className="rounded-full bg-ai/10 px-2 py-0.5 text-xs font-semibold text-ai">Bot activo</span>
              <Button size="sm" variant="outline" onClick={() => setPaused(true)}>
                Pausar bot
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {conversation.messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Sin mensajes todavía.</p>
        )}
        {conversation.messages.map((m) => {
          const isContact = m.source === 'contact'
          return (
            <div key={m.id} className={cn('flex', isContact ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                  isContact ? 'bg-muted' : m.source === 'ai' ? 'bg-ai/10' : 'bg-human/15',
                )}
              >
                <div
                  className={cn(
                    'mb-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    isContact ? 'text-muted-foreground' : m.source === 'ai' ? 'text-ai' : 'text-human',
                  )}
                >
                  {isContact ? 'Cliente' : m.source === 'ai' ? 'IA' : 'Vos'}
                </div>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <div className="mt-0.5 text-right text-[10px] text-muted-foreground">{hhmm(m.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Composer (responder como humano) */}
      <form ref={formRef} action={formAction} className="border-t border-border p-3">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <div className="flex items-end gap-2">
          <Textarea
            name="text"
            required
            placeholder="Escribí una respuesta… (Enter envía · Shift+Enter salta de línea)"
            className="min-h-[44px] flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                formRef.current?.requestSubmit()
              }
            }}
          />
          <Button type="submit" disabled={pending}>
            {pending ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Al responder vos, el bot se pausa automáticamente.</p>
        {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      </form>
    </div>
  )
}
