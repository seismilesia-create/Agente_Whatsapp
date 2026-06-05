/**
 * Cliente mínimo de OpenRouter (API compatible con OpenAI).
 * Soporta contenido multimodal (texto + imágenes) y tool calling.
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemini-2.5-flash'

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ContentPart[] | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export async function chatCompletion(params: {
  messages: ChatMessage[]
  tools?: ToolDef[]
  temperature?: number
  maxTokens?: number
}): Promise<ChatMessage> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('Falta OPENROUTER_API_KEY')

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'Agente WhatsApp',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
      messages: params.messages,
      tools: params.tools,
      tool_choice: params.tools && params.tools.length > 0 ? 'auto' : undefined,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 900,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  const msg = data.choices?.[0]?.message as ChatMessage | undefined
  if (!msg) throw new Error('OpenRouter: respuesta vacía')
  return msg
}

/** Extrae el texto plano de un content (string o partes). */
export function textOf(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n')
  }
  return ''
}
