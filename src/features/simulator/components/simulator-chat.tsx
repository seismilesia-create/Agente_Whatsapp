'use client'

import { useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'

interface Attachment {
  url: string
  type: 'image' | 'video'
  caption?: string
}
interface Msg {
  role: 'user' | 'assistant'
  content: string
  image?: string // dataURL adjunta por el cliente
  attachments?: Attachment[]
}

export function SimulatorChat({
  agentName,
  greeting,
}: {
  agentName: string
  greeting: string
}) {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollDown = () => requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }))

  const pickImage = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPendingImage({ dataUrl: String(reader.result), name: file.name })
    reader.readAsDataURL(file)
  }

  const send = async () => {
    if ((!input.trim() && !pendingImage) || loading) return
    setError(null)
    const userMsg: Msg = { role: 'user', content: input.trim(), image: pendingImage?.dataUrl }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    const img = pendingImage?.dataUrl
    setPendingImage(null)
    setLoading(true)
    scrollDown()

    try {
      const res = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          imageUrl: img,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error del servidor')
      setConversationId(data.conversationId)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, attachments: data.attachments }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
      scrollDown()
    }
  }

  const reset = () => {
    setMessages([{ role: 'assistant', content: greeting }])
    setConversationId(undefined)
    setError(null)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border shadow-sm">
      {/* Header estilo WhatsApp */}
      <div className="flex items-center justify-between bg-ai px-4 py-3 text-ai-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-bold">
            {agentName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{agentName}</p>
            <p className="text-xs opacity-80">{loading ? 'escribiendo…' : 'en línea'}</p>
          </div>
        </div>
        <button onClick={reset} className="rounded-md px-2 py-1 text-xs hover:bg-white/15">
          Reiniciar
        </button>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-auto bg-[#e9ddd1] p-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm',
                m.role === 'user' ? 'bg-[#d9fdd3] text-foreground' : 'bg-white text-foreground',
              )}
            >
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="mb-1 max-h-40 rounded-md object-cover" />
              )}
              {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
              {m.attachments && m.attachments.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {m.attachments.map((a, j) =>
                    a.type === 'video' ? (
                      <video key={j} src={a.url} controls className="rounded-md" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={j} src={a.url} alt={a.caption ?? ''} className="rounded-md object-cover" />
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">escribiendo…</div>
          </div>
        )}
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-2">
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>📎 {pendingImage.name}</span>
            <button onClick={() => setPendingImage(null)} className="text-destructive">quitar</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
            title="Adjuntar imagen"
          >
            📷
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Escribí como cliente…"
            className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={send}
            disabled={loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ai text-ai-foreground disabled:opacity-50"
            title="Enviar"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
