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
    ? '- Para agendar usá reservar_turno con: el servicio, la FECHA (campo fecha, YYYY-MM-DD) y la HORA (HH:MM) EXACTAS que devolvió consultar_disponibilidad, y el nombre del cliente. El TELÉFONO ya lo tenés (ver DATOS DEL CLIENTE): pasalo en el campo telefono y NO se lo pidas. Confirmá antes de reservar.'
    : '- Para agendar usá reservar_turno con: el servicio, la FECHA (campo fecha, YYYY-MM-DD) y la HORA (HH:MM) EXACTAS de consultar_disponibilidad, y el nombre y teléfono del cliente. Pedí lo que falte y confirmá antes de reservar.'

  return `${config.system_prompt}

DATOS DEL NEGOCIO
- Negocio: ${config.business_name || organizationName}
- Hoy es: ${nowAR()} (hora de Argentina)
- Tono: ${config.tone}

${clienteBlock}HORARIOS DE ATENCIÓN
${scheduleToText(hours, exceptions)}

CATÁLOGO (productos y servicios)
${catalogToText(catalog)}

PREGUNTAS FRECUENTES
${faqs || '(sin FAQs)'}

INSTRUCCIONES OPERATIVAS
- Respondé en español rioplatense, breve y natural, estilo WhatsApp. Usá emojis con moderación.
- Para ver horarios disponibles usá la herramienta consultar_disponibilidad. NUNCA inventes horarios.
- Los HORARIOS DE ATENCIÓN de arriba son la referencia general; informalos si te preguntan. Nunca ofrezcas turnos en días cerrados ni en fechas marcadas como cerradas (feriados, vacaciones).
${reservarInstruction}
- Si el cliente quiere ver un producto/servicio que tiene fotos o videos, usá enviar_material para mandárselos.
- Si te mandan una foto, miralá y respondé en consecuencia.
- No inventes precios, stock ni datos que no estén arriba. Si no sabés algo, ofrecé confirmarlo.
- Si no podés resolver o piden una persona, derivá con: "${config.handoff_message}".`
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
