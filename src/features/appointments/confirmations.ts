import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppText } from '@/lib/whatsapp'

/**
 * Motor de "Confirmación de turno" (feature premium).
 * Para cada organización con `features.appointment_confirmation = true`, manda un
 * recordatorio por WhatsApp a quien sacó un turno que entra en la ventana configurada
 * (X horas antes), una sola vez (marca `confirmation_sent_at`). Lo dispara el cron.
 */

const AR_TZ = 'America/Argentina/Cordoba'
const DEFAULT_TEMPLATE =
  '¡Hola {nombre}! 👋 Te recordamos tu turno de {servicio} el {fecha} a las {hora} hs. ¿Lo confirmás? Respondé *SÍ* para confirmar o *NO* para cancelar. ¡Gracias!'

export interface ConfirmationRunResult {
  premiumOrgs: number
  sent: number
}

interface ApptRow {
  id: string
  starts_at: string
  contact: { id: string; name: string | null; phone: string } | { id: string; name: string | null; phone: string }[] | null
  service: { name: string } | { name: string }[] | null
}

const fmtFecha = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: AR_TZ }).format(new Date(iso))
const fmtHora = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: AR_TZ }).format(new Date(iso))

function first<T>(v: T | T[] | null): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

/** Conversación abierta del contacto (la crea si no existe), para registrar el recordatorio. */
async function ensureConversation(db: SupabaseClient, orgId: string, contactId: string): Promise<string | null> {
  const { data: open } = await db
    .from('conversations')
    .select('id')
    .eq('organization_id', orgId)
    .eq('contact_id', contactId)
    .eq('status', 'open')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (open) return (open as { id: string }).id
  const { data } = await db
    .from('conversations')
    .insert({ organization_id: orgId, contact_id: contactId, status: 'open' })
    .select('id')
    .single()
  return (data as { id: string } | null)?.id ?? null
}

export async function runAppointmentConfirmations(db: SupabaseClient): Promise<ConfirmationRunResult> {
  const { data: orgsData } = await db.from('organizations').select('id, name, features')
  const orgs = ((orgsData as { id: string; name: string; features: Record<string, boolean> | null }[]) ?? []).filter(
    (o) => o.features?.appointment_confirmation === true,
  )

  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const phoneNumberId = process.env.WHATSAPP_TEST_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_TEST_ACCESS_TOKEN
  let sent = 0

  for (const org of orgs) {
    const { data: cfgData } = await db
      .from('business_config')
      .select('confirmation_hours_before, confirmation_message, business_name')
      .eq('organization_id', org.id)
      .maybeSingle()
    const cfg = cfgData as
      | { confirmation_hours_before: number; confirmation_message: string | null; business_name: string | null }
      | null
    const hours = cfg?.confirmation_hours_before ?? 24
    const template = cfg?.confirmation_message || DEFAULT_TEMPLATE
    const businessName = cfg?.business_name || org.name
    const windowIso = new Date(nowMs + hours * 3_600_000).toISOString()

    const { data: apptData } = await db
      .from('appointments')
      .select('id, starts_at, contact:contacts(id, name, phone), service:services(name)')
      .eq('organization_id', org.id)
      .eq('status', 'booked')
      .is('confirmation_sent_at', null)
      .gt('starts_at', nowIso)
      .lte('starts_at', windowIso)

    for (const a of (apptData as ApptRow[]) ?? []) {
      const contact = first(a.contact)
      const service = first(a.service)

      const text = template
        .replaceAll('{nombre}', contact?.name || 'cliente')
        .replaceAll('{servicio}', service?.name || 'tu turno')
        .replaceAll('{fecha}', fmtFecha(a.starts_at))
        .replaceAll('{hora}', fmtHora(a.starts_at))
        .replaceAll('{negocio}', businessName)

      // Envío real por WhatsApp (best-effort; en prod serían las credenciales de cada org).
      if (contact?.phone && contact.phone !== 'simulador' && phoneNumberId && accessToken) {
        try {
          await sendWhatsAppText({ phoneNumberId, accessToken, to: contact.phone, text })
        } catch {
          // best-effort
        }
      }

      // Registrar el recordatorio en la conversación del contacto (visible en la bandeja).
      if (contact?.id) {
        const convId = await ensureConversation(db, org.id, contact.id)
        if (convId) {
          await db.from('messages').insert({
            organization_id: org.id,
            conversation_id: convId,
            direction: 'outbound',
            source: 'ai',
            content: text,
          })
          await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)
        }
      }

      await db.from('appointments').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', a.id)
      sent++
    }
  }

  return { premiumOrgs: orgs.length, sent }
}
