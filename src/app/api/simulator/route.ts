import { NextResponse } from 'next/server'
import { getSessionContext } from '@/shared/lib/get-session'
import { getBusinessConfig } from '@/features/config/services'
import { getCatalogItems } from '@/features/catalog/services'
import { buildSystemPrompt, runAgentTurn } from '@/features/ai-agent/agent'
import { createSimConversation, addMessage } from '@/features/conversations/services'
import type { ChatMessage } from '@/lib/openrouter'

interface Body {
  conversationId?: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  imageUrl?: string
}

export async function POST(req: Request) {
  const ctx = await getSessionContext()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const [config, catalog] = await Promise.all([getBusinessConfig(), getCatalogItems()])
  if (!config) return NextResponse.json({ error: 'Sin configuración' }, { status: 400 })

  const systemPrompt = buildSystemPrompt({
    config,
    organizationName: ctx.organization.name,
    catalog,
  })

  // Construir el historial para el modelo; adjuntar imagen al último mensaje del usuario
  const history: ChatMessage[] = body.messages.map((m, i) => {
    const isLastUser = i === body.messages.length - 1 && m.role === 'user'
    if (isLastUser && body.imageUrl) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: m.content || '(imagen)' },
          { type: 'image_url', image_url: { url: body.imageUrl } },
        ],
      }
    }
    return { role: m.role, content: m.content }
  })

  // Asegurar conversación + persistir el último mensaje del usuario
  const conversationId = body.conversationId ?? (await createSimConversation(ctx.organization.id))
  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')
  if (conversationId && lastUser) {
    await addMessage({
      organizationId: ctx.organization.id,
      conversationId,
      direction: 'inbound',
      source: 'contact',
      content: body.imageUrl ? `${lastUser.content} [imagen adjunta]` : lastUser.content,
    })
  }

  let result
  try {
    result = await runAgentTurn({ systemPrompt, history, catalog })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error del agente' },
      { status: 502 },
    )
  }

  // Persistir respuesta del agente
  if (conversationId) {
    await addMessage({
      organizationId: ctx.organization.id,
      conversationId,
      direction: 'outbound',
      source: 'ai',
      content: result.reply,
    })
  }

  return NextResponse.json({
    conversationId,
    reply: result.reply,
    attachments: result.attachments,
  })
}
