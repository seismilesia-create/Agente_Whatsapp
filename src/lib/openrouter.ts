/**
 * Cliente de LLM (API compatible con OpenAI). Soporta multimodal + tool calling.
 * Provider configurable vía env LLM_PROVIDER:
 *   - 'openrouter' (default): nube, usa OPENROUTER_API_KEY + OPENROUTER_MODEL
 *   - 'ollama': local, usa OLLAMA_BASE_URL (default http://localhost:11434/v1) + OLLAMA_MODEL
 */
const DEFAULT_MODEL = 'google/gemini-2.5-flash'

interface LlmConfig {
  url: string
  apiKey: string
  model: string
  headers: Record<string, string>
}

function getLlmConfig(): LlmConfig {
  const provider = process.env.LLM_PROVIDER ?? 'openrouter'

  if (provider === 'ollama') {
    const base = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1'
    return {
      url: `${base.replace(/\/$/, '')}/chat/completions`,
      apiKey: 'ollama', // Ollama no requiere auth
      model: process.env.OLLAMA_MODEL ?? 'gemma4:26b',
      headers: {},
    }
  }

  return {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    model: process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'Agente WhatsApp',
    },
  }
}

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
  const cfg = getLlmConfig()

  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      ...cfg.headers,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: params.messages,
      tools: params.tools,
      tool_choice: params.tools && params.tools.length > 0 ? 'auto' : undefined,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 1200,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  const msg = data.choices?.[0]?.message as ChatMessage | undefined
  if (!msg) throw new Error('LLM: respuesta vacía')
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
