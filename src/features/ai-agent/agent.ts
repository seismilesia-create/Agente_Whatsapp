import { chatCompletion, textOf, type ChatMessage, type ToolDef } from '@/lib/openrouter'
import type { DayAvailability } from '@/features/appointments/services'
import { arDateString } from '@/features/appointments/slots'
import type {
  BusinessConfig,
  BusinessHour,
  CatalogItemWithMedia,
  MediaType,
  ScheduleException,
} from '@/shared/types/database'

export interface Attachment {
  url: string
  type: MediaType
  caption: string
}

export interface AgentResult {
  reply: string
  attachments: Attachment[]
}

/**
 * Funciones de datos que el agente usa, inyectadas según el contexto:
 * - simulador: usan la sesión del usuario (RLS)
 * - webhook WhatsApp: usan el admin client + organizationId explícito
 */
export interface AgentDeps {
  getSlots: (serviceId: string) => Promise<DayAvailability[]>
  book: (input: {
    serviceId: string
    startsAt: string
    contactName?: string
    contactPhone: string
  }) => Promise<{ ok: boolean; error?: string }>
}

const AR_TZ = 'America/Argentina/Buenos_Aires'
const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function nowAR(): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: AR_TZ,
  }).format(new Date())
}

function catalogToText(items: CatalogItemWithMedia[]): string {
  const active = items.filter((i) => i.active)
  if (active.length === 0) return '(sin ítems cargados)'
  return active
    .map((i) => {
      const tipo = i.kind === 'product' ? 'Producto' : 'Servicio'
      const extra = i.kind === 'service' ? `${i.duration_min} min` : i.stock != null ? `stock ${i.stock}` : 'a consultar'
      const attrs = (i.attributes ?? []).map((a) => `${a.label}: ${a.value}`).join(', ')
      const media = i.media?.length ? ` [tiene ${i.media.length} archivo(s) para enviar]` : ''
      return `- [${tipo}] ${i.name} — ${money(i.price)} — ${extra}${i.description ? ` — ${i.description}` : ''}${attrs ? ` (${attrs})` : ''}${media}`
    })
    .join('\n')
}

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const hhmm = (t: string) => t.slice(0, 5)
const ddmm = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** Texto de horarios semanales + próximos cierres/fechas especiales para el prompt. */
function scheduleToText(hours: BusinessHour[], exceptions: ScheduleException[]): string {
  const weekly = WEEKDAY_ORDER.map((wd) => {
    const blocks = hours
      .filter((h) => h.weekday === wd)
      .sort((a, b) => a.open_time.localeCompare(b.open_time))
      .map((h) => `${hhmm(h.open_time)}–${hhmm(h.close_time)}`)
      .join(' y ')
    return `- ${WEEKDAY_NAMES[wd]}: ${blocks || 'cerrado'}`
  }).join('\n')

  const today = arDateString(Date.now(), 0)
  const upcoming = exceptions
    .filter((e) => e.end_date >= today && e.kind !== 'open')
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 10)
    .map((e) => {
      const when =
        e.start_date === e.end_date
          ? ddmm(e.start_date)
          : `del ${ddmm(e.start_date)} al ${ddmm(e.end_date)}`
      const note = e.note ? ` (${e.note})` : ''
      if (e.kind === 'closed') return `- ${when}: cerrado${note}`
      const ranges = e.ranges.map((r) => `${r.open}–${r.close}`).join(' y ')
      return `- ${when}: horario especial ${ranges}${note}`
    })
    .join('\n')

  return upcoming ? `${weekly}\n\nPRÓXIMOS CIERRES Y FECHAS ESPECIALES\n${upcoming}` : weekly
}

/**
 * Constitución interna que rige a TODOS los agentes (la define la fábrica, no el cliente).
 * La configuración de cada negocio se agrega como una capa ENCIMA de esta base.
 */
const BASE_SYSTEM_PROMPT = `Sos un asistente virtual de atención al cliente por WhatsApp de un negocio. Atendés las 24 horas, de forma cordial, breve y resolutiva. Tu trabajo es responder consultas sobre los productos y servicios del negocio y agendar turnos cuando corresponda. Más abajo vas a encontrar la personalidad y reglas propias de este negocio, sus datos, horarios, catálogo y preguntas frecuentes: respetalos siempre.

REGLAS QUE NO PODÉS ROMPER (valen para cualquier negocio):

1) USÁ LAS HERRAMIENTAS Y NUNCA INVENTES.
- Para ver horarios disponibles usá consultar_disponibilidad. Ofrecé ÚNICAMENTE los horarios EXACTOS que devuelve (con su fecha y hora tal cual). NUNCA redondees, estimes ni inventes un horario: si la herramienta ofrece 18:15, ofrecé 18:15 y jamás 18:00. Si no hay horarios, decilo.
- Para reservar usá reservar_turno con la FECHA (YYYY-MM-DD) y la HORA (HH:MM) EXACTAS de un horario realmente ofrecido por consultar_disponibilidad.
- Para mostrar fotos o videos de un ítem usá enviar_material.
- NUNCA inventes precios, stock, horarios, servicios ni datos que no estén en el CATÁLOGO, los HORARIOS o las FAQ de abajo. Si no sabés algo, ofrecé confirmarlo con el equipo.

2) DISTINGUÍ SERVICIOS DE PRODUCTOS.
- Los SERVICIOS se AGENDAN (turno) y tienen una duración. Para un servicio, ofrecé turno.
- Los PRODUCTOS se VENDEN y tienen precio y/o stock. Para un producto NO se agenda turno: informás y ayudás con la venta.

3) FLUJO PARA AGENDAR UN TURNO.
- Averiguá qué SERVICIO quiere el cliente.
- Llamá a consultar_disponibilidad y ofrecé los horarios reales que devuelve.
- Cuando elija, confirmá con él el servicio, el día y la hora.
- Recién ahí llamá a reservar_turno con esa fecha y hora exactas.
- CRÍTICO: confirmá al cliente que el turno quedó agendado SOLO si reservar_turno devolvió ok:true. Si devolvió un error (por ejemplo "ese horario no está disponible"), NO digas que quedó confirmado: pedí disculpas, volvé a consultar_disponibilidad y ofrecé horarios reales.

4) ANTE LA DUDA, DERIVÁ A UN HUMANO.
- Si no estás seguro de algo, si te piden algo que no podés resolver con las herramientas y los datos de abajo, si hay un reclamo o una situación delicada, o si el cliente pide hablar con una persona: NO inventes ni adivines. Derivá a alguien del equipo con el mensaje de transferencia. SIEMPRE es preferible derivar a un humano antes que dar información incorrecta o asumir algo.

5) ESTILO.
- Español rioplatense, breve y natural, estilo WhatsApp. Emojis con moderación.
- Sé cálido y claro. No prometas nada que no puedas cumplir.`

export function buildSystemPrompt(params: {
  config: BusinessConfig
  organizationName: string
  catalog: CatalogItemWithMedia[]
  hours: BusinessHour[]
  exceptions: ScheduleException[]
  contactPhone?: string
  contactName?: string
}): string {
  const { config, organizationName, catalog, hours, exceptions, contactPhone, contactName } = params
  const faqs = (config.faqs ?? []).map((f) => `P: ${f.q}\nR: ${f.a}`).join('\n')

  // En WhatsApp ya conocemos el teléfono del cliente (es el número desde el que escribe).
  const clienteBlock = contactPhone
    ? `DATOS DEL CLIENTE (te escribe por WhatsApp)\n- Teléfono: ${contactPhone} — YA lo tenés (es el número desde el que te escribe). NUNCA se lo pidas; usalo para reservar.\n${contactName ? `- Nombre (de su WhatsApp): ${contactName}\n` : ''}\n`
    : ''
  const reservarInstruction = contactPhone
    ? '- El TELÉFONO del cliente ya lo tenés (ver DATOS DEL CLIENTE): usalo para reservar y NO se lo pidas.'
    : '- Para reservar pedí también el nombre y el teléfono del cliente si no los tenés.'

  return `${BASE_SYSTEM_PROMPT}

══════════ PERSONALIDAD Y REGLAS DE ESTE NEGOCIO ══════════
${config.system_prompt}

══════════ DATOS DEL NEGOCIO ══════════
- Negocio: ${config.business_name || organizationName}
- Hoy es: ${nowAR()} (hora de Argentina)
- Tono: ${config.tone}

${clienteBlock}══════════ HORARIOS DE ATENCIÓN ══════════
${scheduleToText(hours, exceptions)}

══════════ CATÁLOGO (productos y servicios) ══════════
${catalogToText(catalog)}

══════════ PREGUNTAS FRECUENTES ══════════
${faqs || '(sin FAQs)'}

══════════ RECORDATORIOS ══════════
- Los HORARIOS DE ATENCIÓN son la referencia; informalos si preguntan. Nunca ofrezcas turnos en días o fechas cerradas (feriados, vacaciones).
${reservarInstruction}
- Si te mandan una foto, miralá y respondé en consecuencia.
- Para derivar a una persona, usá este mensaje: "${config.handoff_message}".`
}

const TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidad',
      description: 'Devuelve los próximos horarios disponibles para un servicio. Usar antes de ofrecer turnos.',
      parameters: {
        type: 'object',
        properties: { servicio: { type: 'string', description: 'Nombre del servicio a consultar' } },
        required: ['servicio'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reservar_turno',
      description: 'Reserva un turno en un horario disponible. Confirmar datos con el cliente antes de llamar.',
      parameters: {
        type: 'object',
        properties: {
          servicio: { type: 'string' },
          fecha: { type: 'string', description: 'Fecha del turno en formato YYYY-MM-DD (campo fecha de consultar_disponibilidad)' },
          hora: { type: 'string', description: 'Hora del turno en formato HH:MM 24h (uno de los horarios ofrecidos)' },
          nombre_cliente: { type: 'string' },
          telefono: { type: 'string' },
        },
        required: ['servicio', 'fecha', 'hora', 'nombre_cliente', 'telefono'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enviar_material',
      description: 'Envía al cliente las fotos/videos cargados de un producto o servicio.',
      parameters: {
        type: 'object',
        properties: { item: { type: 'string', description: 'Nombre del producto o servicio' } },
        required: ['item'],
      },
    },
  },
]

function findItem(catalog: CatalogItemWithMedia[], query: string): CatalogItemWithMedia | undefined {
  const q = query.toLowerCase().trim()
  return (
    catalog.find((i) => i.name.toLowerCase() === q) ??
    catalog.find((i) => i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase()))
  )
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  catalog: CatalogItemWithMedia[],
  attachments: Attachment[],
  deps: AgentDeps,
): Promise<string> {
  if (name === 'consultar_disponibilidad') {
    const item = findItem(catalog, String(args.servicio ?? ''))
    if (!item || item.kind !== 'service') return JSON.stringify({ error: 'Servicio no encontrado en el catálogo.' })
    const days = await deps.getSlots(item.id)
    const compact = days.slice(0, 5).map((d) => ({
      fecha: d.date, // YYYY-MM-DD — pasalo tal cual a reservar_turno
      dia: new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: AR_TZ }).format(new Date(`${d.date}T12:00:00-03:00`)),
      // Horarios del día en HH:MM (mañana y tarde); cap alto para no ocultar disponibilidad.
      horarios: d.slots.slice(0, 24).map((s) => s.label),
    }))
    if (compact.length === 0) return JSON.stringify({ servicio: item.name, mensaje: 'No hay horarios disponibles próximamente.' })
    return JSON.stringify({ servicio: item.name, duracion_min: item.duration_min, disponibilidad: compact })
  }

  if (name === 'reservar_turno') {
    const item = findItem(catalog, String(args.servicio ?? ''))
    if (!item || item.kind !== 'service') return JSON.stringify({ ok: false, error: 'Servicio no encontrado.' })

    // La IA pasa fecha (YYYY-MM-DD) + hora (HH:MM) en hora de Argentina; el SERVIDOR arma el
    // instante correcto (offset -03:00) → así no hay errores de huso ni inicio_iso inventado.
    const fecha = String(args.fecha ?? '')
    const horaRaw = String(args.hora ?? '').trim()
    const hora = /^\d:\d{2}$/.test(horaRaw) ? `0${horaRaw}` : horaRaw
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
      return JSON.stringify({
        ok: false,
        error: 'Fecha u hora inválida. Usá fecha YYYY-MM-DD y hora HH:MM de las que devolvió consultar_disponibilidad.',
      })
    }
    const startsAt = new Date(`${fecha}T${hora}:00-03:00`).toISOString()

    // Validar que sea un horario realmente disponible (no inventado ni ocupado).
    const days = await deps.getSlots(item.id)
    const esHorarioReal = days.some((d) => d.slots.some((s) => s.startsAt === startsAt))
    if (!esHorarioReal) {
      return JSON.stringify({
        ok: false,
        error: 'Ese horario no está disponible. Volvé a llamar a consultar_disponibilidad y elegí una fecha y hora EXACTAS de las ofrecidas.',
      })
    }

    const res = await deps.book({
      serviceId: item.id,
      startsAt,
      contactName: String(args.nombre_cliente ?? ''),
      contactPhone: String(args.telefono ?? ''),
    })
    if (!res.ok) return JSON.stringify({ ok: false, error: res.error })
    return JSON.stringify({ ok: true, mensaje: `Turno confirmado para ${item.name}.` })
  }

  if (name === 'enviar_material') {
    const item = findItem(catalog, String(args.item ?? ''))
    if (!item) return JSON.stringify({ error: 'Ítem no encontrado.' })
    if (!item.media || item.media.length === 0) return JSON.stringify({ enviados: 0, mensaje: 'Ese ítem no tiene fotos/videos cargados.' })
    for (const m of item.media) {
      attachments.push({ url: m.url, type: m.type, caption: item.name })
    }
    return JSON.stringify({ enviados: item.media.length, mensaje: `Enviadas ${item.media.length} archivo(s) de ${item.name}.` })
  }

  return JSON.stringify({ error: 'Herramienta desconocida' })
}

/**
 * Ejecuta un turno del agente: corre el loop de tool calling hasta la respuesta final.
 */
export async function runAgentTurn(params: {
  systemPrompt: string
  history: ChatMessage[]
  catalog: CatalogItemWithMedia[]
  deps: AgentDeps
}): Promise<AgentResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: params.systemPrompt },
    ...params.history,
  ]
  const attachments: Attachment[] = []

  for (let step = 0; step < 5; step++) {
    const msg = await chatCompletion({ messages, tools: TOOLS })

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg)
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.function.arguments || '{}')
        } catch {
          args = {}
        }
        const result = await executeTool(tc.function.name, args, params.catalog, attachments, params.deps)
        messages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: result })
      }
      continue
    }

    return { reply: textOf(msg.content) || '…', attachments }
  }

  return { reply: 'Disculpá, tuve un problema procesando eso. ¿Lo intentamos de nuevo?', attachments }
}
