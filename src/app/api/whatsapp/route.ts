import { handleIncomingWhatsApp } from '@/features/whatsapp/runner'

/**
 * Verificación del webhook (Meta hace un GET al configurarlo).
 * Devuelve el hub.challenge si el verify_token coincide.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

/**
 * Recepción de mensajes entrantes. Respondemos 200 siempre (Meta reintenta si no).
 */
export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  try {
    await handleIncomingWhatsApp(payload)
  } catch (e) {
    console.error('WhatsApp webhook error:', e)
  }

  return new Response('OK', { status: 200 })
}
