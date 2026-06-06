/**
 * Cliente de Meta WhatsApp Cloud API.
 * Enviar mensajes (texto / imagen) y parsear los webhooks entrantes.
 */
const GRAPH_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

/**
 * Normaliza el número destinatario para el envío.
 * Argentina (54): los mensajes ENTRANTES llegan como `549XXXXXXXXXX` (con 9),
 * pero la Cloud API exige enviar a `54XXXXXXXXXX` (sin el 9). Sin esto, Meta
 * rechaza con (#131030) "Recipient phone number not in allowed list".
 */
export function normalizeRecipient(to: string): string {
  const digits = to.replace(/\D/g, '')
  if (digits.startsWith('549')) return '54' + digits.slice(3)
  return digits
}

interface SendParams {
  phoneNumberId: string
  accessToken: string
  to: string
}

export async function sendWhatsAppText(params: SendParams & { text: string }): Promise<boolean> {
  const res = await fetch(`${GRAPH_BASE}/${params.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeRecipient(params.to),
      type: 'text',
      text: { body: params.text },
    }),
  })
  if (!res.ok) console.error('WhatsApp sendText error:', await res.text())
  return res.ok
}

export async function sendWhatsAppImage(
  params: SendParams & { imageUrl: string; caption?: string },
): Promise<boolean> {
  const res = await fetch(`${GRAPH_BASE}/${params.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizeRecipient(params.to),
      type: 'image',
      image: { link: params.imageUrl, caption: params.caption },
    }),
  })
  if (!res.ok) console.error('WhatsApp sendImage error:', await res.text())
  return res.ok
}

/** Marca un mensaje entrante como leído (los dos tildes azules). */
export async function markAsRead(params: SendParams & { messageId: string }): Promise<void> {
  await fetch(`${GRAPH_BASE}/${params.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: params.messageId }),
  }).catch(() => {})
}

export interface IncomingMessage {
  phoneNumberId: string // número del negocio que recibió (para enrutar)
  from: string // teléfono del cliente
  messageId: string
  contactName?: string
  type: 'text' | 'image' | 'audio' | 'other'
  text?: string
  mediaId?: string // para imágenes/audio (se descarga aparte)
}

/**
 * Extrae el mensaje entrante de un payload del webhook de Meta.
 * Devuelve null si el evento no es un mensaje de usuario (ej. status updates).
 */
export function parseIncomingMessage(payload: unknown): IncomingMessage | null {
  try {
    const entry = (payload as { entry?: unknown[] })?.entry?.[0] as
      | { changes?: { value?: Record<string, unknown> }[] }
      | undefined
    const value = entry?.changes?.[0]?.value
    if (!value) return null

    const metadata = value.metadata as { phone_number_id?: string } | undefined
    const messages = value.messages as Record<string, unknown>[] | undefined
    const msg = messages?.[0]
    if (!msg || !metadata?.phone_number_id) return null

    const contacts = value.contacts as { profile?: { name?: string } }[] | undefined
    const type = String(msg.type)
    const base: IncomingMessage = {
      phoneNumberId: metadata.phone_number_id,
      from: String(msg.from),
      messageId: String(msg.id),
      contactName: contacts?.[0]?.profile?.name,
      type: type === 'text' || type === 'image' || type === 'audio' ? (type as IncomingMessage['type']) : 'other',
    }

    if (type === 'text') base.text = (msg.text as { body?: string })?.body
    else if (type === 'image') {
      base.mediaId = (msg.image as { id?: string })?.id
      base.text = (msg.image as { caption?: string })?.caption
    } else if (type === 'audio') {
      base.mediaId = (msg.audio as { id?: string })?.id
    }

    return base
  } catch {
    return null
  }
}

/** Descarga un archivo de media de WhatsApp y lo devuelve como data URL (para visión). */
export async function fetchWhatsAppMediaAsDataUrl(
  mediaId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const meta = await fetch(`${GRAPH_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json())
    if (!meta?.url) return null
    const bin = await fetch(meta.url, { headers: { Authorization: `Bearer ${accessToken}` } })
    const buf = Buffer.from(await bin.arrayBuffer())
    const mime = meta.mime_type ?? 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
