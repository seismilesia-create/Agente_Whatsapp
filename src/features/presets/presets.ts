import type { CatalogKind, Faq, OrgVertical } from '@/shared/types/database'

/**
 * Preset de rubro: paquete de configuración listo para aplicar a una organización.
 * Rellena business_config + crea services + business_hours en un solo paso.
 */
export interface PresetService {
  name: string
  duration_min: number
  price: number // ARS de referencia (también base para seña)
  /** 'service' (se agenda) o 'product' (se vende). Default: 'service'. */
  kind?: CatalogKind
  description?: string
  /** Color del chip en la agenda (hex). */
  color?: string
  /** Stock para productos. */
  stock?: number
}

export interface PresetHour {
  weekday: number // 0=domingo … 6=sábado
  open_time: string // 'HH:MM'
  close_time: string
}

export interface IndustryPreset {
  key: string
  label: string
  emoji: string
  description: string
  vertical: OrgVertical
  agent_name: string
  tone: string
  system_prompt: string
  greeting_message: string
  handoff_message: string
  faqs: Faq[]
  services: PresetService[]
  business_hours: PresetHour[]
}

// Horarios reutilizables (registro Argentina, con siesta donde aplica)
const HOURS_SALUD: PresetHour[] = [
  { weekday: 1, open_time: '09:00', close_time: '13:00' },
  { weekday: 1, open_time: '16:00', close_time: '20:00' },
  { weekday: 2, open_time: '09:00', close_time: '13:00' },
  { weekday: 2, open_time: '16:00', close_time: '20:00' },
  { weekday: 3, open_time: '09:00', close_time: '13:00' },
  { weekday: 3, open_time: '16:00', close_time: '20:00' },
  { weekday: 4, open_time: '09:00', close_time: '13:00' },
  { weekday: 4, open_time: '16:00', close_time: '20:00' },
  { weekday: 5, open_time: '09:00', close_time: '13:00' },
  { weekday: 5, open_time: '16:00', close_time: '20:00' },
]

const HOURS_ESTETICA: PresetHour[] = [
  { weekday: 2, open_time: '10:00', close_time: '19:00' },
  { weekday: 3, open_time: '10:00', close_time: '19:00' },
  { weekday: 4, open_time: '10:00', close_time: '19:00' },
  { weekday: 5, open_time: '10:00', close_time: '19:00' },
  { weekday: 6, open_time: '10:00', close_time: '17:00' },
]

const HOURS_PELUQUERIA: PresetHour[] = [
  { weekday: 2, open_time: '09:00', close_time: '13:00' },
  { weekday: 2, open_time: '15:00', close_time: '20:00' },
  { weekday: 3, open_time: '09:00', close_time: '13:00' },
  { weekday: 3, open_time: '15:00', close_time: '20:00' },
  { weekday: 4, open_time: '09:00', close_time: '13:00' },
  { weekday: 4, open_time: '15:00', close_time: '20:00' },
  { weekday: 5, open_time: '09:00', close_time: '13:00' },
  { weekday: 5, open_time: '15:00', close_time: '20:00' },
  { weekday: 6, open_time: '09:00', close_time: '14:00' },
]

const HOURS_GYM: PresetHour[] = [
  { weekday: 1, open_time: '08:00', close_time: '22:00' },
  { weekday: 2, open_time: '08:00', close_time: '22:00' },
  { weekday: 3, open_time: '08:00', close_time: '22:00' },
  { weekday: 4, open_time: '08:00', close_time: '22:00' },
  { weekday: 5, open_time: '08:00', close_time: '22:00' },
  { weekday: 6, open_time: '09:00', close_time: '13:00' },
]

export const PRESETS: IndustryPreset[] = [
  // ─────────────────────────────── SALUD / CONSULTORIO ───────────────────────────────
  {
    key: 'salud',
    label: 'Salud / Consultorio',
    emoji: '🩺',
    description: 'Consultorios médicos. Agenda turnos, distingue paciente nuevo/recurrente, gestiona obras sociales.',
    vertical: 'turnos',
    agent_name: 'Sofía',
    tone: 'profesional, cálido y claro (registro médico-asistencial)',
    system_prompt: `Sos Sofía, la asistente virtual del consultorio. Tu objetivo es agendar turnos y responder consultas administrativas por WhatsApp, las 24 horas.

REGLAS:
- Saludá con calidez y preguntá en qué podés ayudar.
- Para agendar: averiguá si es paciente NUEVO o de seguimiento, qué necesita (consulta, control, urgencia), con qué obra social o particular, y ofrecé los horarios disponibles según la duración del servicio.
- NUNCA des diagnósticos, indicaciones médicas ni interpretes síntomas. Si preguntan algo clínico, respondé que eso lo evalúa el profesional en la consulta.
- NUNCA inventes precios de tratamientos ni cobertura de obras sociales: si no está en las FAQs, ofrecé confirmarlo con el equipo.
- Ante una URGENCIA o malestar fuerte, derivá de inmediato a un humano con el mensaje de transferencia.
- Sé breve, amable y respetuosa. Tratá de usted o de vos según cómo te hable el paciente.`,
    greeting_message: '¡Hola! 👋 Soy Sofía, del consultorio. ¿Querés sacar un turno o tenés una consulta?',
    handoff_message: 'Te paso con alguien del equipo para ayudarte mejor. Aguardá un momento por favor 🙌',
    faqs: [
      { q: '¿Qué obras sociales atienden?', a: 'Trabajamos con las principales obras sociales y prepagas, y también atendemos particulares. Decime cuál tenés y lo confirmo.' },
      { q: '¿Dónde están ubicados?', a: 'Estamos en la dirección que figura en nuestro perfil. Si querés te paso la ubicación por el mapa.' },
      { q: '¿Cómo cancelo o reprogramo un turno?', a: 'Avisame con al menos 24 hs de anticipación y lo reprogramamos sin problema.' },
      { q: '¿Atienden urgencias?', a: 'Sí. Si es una urgencia, contame brevemente y te derivo ya con el equipo.' },
    ],
    services: [
      { name: 'Consulta general', duration_min: 30, price: 15000, color: '#22c55e', description: 'Consulta clínica con el profesional para evaluación, diagnóstico y plan de tratamiento.' },
      { name: 'Control / seguimiento', duration_min: 20, price: 8000, color: '#f97316', description: 'Control de evolución para pacientes en tratamiento. Más breve que la primera consulta.' },
      { name: 'Urgencia', duration_min: 30, price: 20000, color: '#ef4444', description: 'Atención prioritaria por dolor o problema agudo. Se coordina en el primer horario libre.' },
    ],
    business_hours: HOURS_SALUD,
  },

  // ─────────────────────────────── ODONTOLOGÍA ───────────────────────────────
  {
    key: 'odontologia',
    label: 'Odontología / Clínica dental',
    emoji: '🦷',
    description: 'Clínicas y consultorios dentales. Agenda turnos, calma el miedo al dentista, gestiona tratamientos y obras sociales.',
    vertical: 'turnos',
    agent_name: 'Caro',
    tone: 'profesional, cálido y tranquilizador',
    system_prompt: `Sos Caro, la asistente de la clínica dental. Atendés por WhatsApp las 24 horas para sacar turnos y responder consultas administrativas.

REGLAS:
- Saludá con calidez y transmitir tranquilidad (mucha gente tiene miedo al dentista).
- Para agendar: averiguá si es paciente NUEVO o de seguimiento, qué necesita (consulta, limpieza, blanqueamiento, arreglo, ortodoncia, urgencia) y ofrecé los horarios según la duración del servicio.
- NUNCA des diagnósticos ni indicaciones clínicas: eso lo evalúa el odontólogo en la consulta.
- NUNCA inventes precios ni cobertura de obras sociales: si no está en las FAQs, ofrecé confirmarlo con el equipo.
- Si hay dolor fuerte o urgencia, derivá de inmediato a un humano.
- Sé breve, empática y clara.`,
    greeting_message: '¡Hola! 🦷 Soy Caro, de la clínica dental. ¿Querés sacar un turno o tenés una consulta?',
    handoff_message: 'Te paso con alguien del equipo para ayudarte mejor. Aguardá un momentito por favor 🙌',
    faqs: [
      { q: '¿Atienden obras sociales?', a: 'Trabajamos con las principales obras sociales y también particulares. Decime cuál tenés y lo confirmo.' },
      { q: '¿El blanqueamiento duele?', a: 'Es un procedimiento indoloro; algunos sienten sensibilidad leve. El profesional te explica todo en la consulta.' },
      { q: '¿Hacen ortodoncia con brackets y alineadores?', a: 'Sí, ofrecemos ambos. Sacá un turno de Consulta de ortodoncia y te armamos el presupuesto.' },
      { q: '¿Atienden urgencias por dolor?', a: 'Sí. Contame brevemente qué te pasa y te derivo ya con el equipo para darte prioridad.' },
      { q: '¿Se puede pagar en cuotas?', a: 'Según el tratamiento ofrecemos planes de pago. Lo vemos en la consulta con el presupuesto.' },
    ],
    services: [
      { name: 'Consulta y diagnóstico', duration_min: 30, price: 12000, color: '#38bdf8', description: 'Primera consulta: revisión, diagnóstico y plan de tratamiento personalizado.' },
      { name: 'Limpieza dental', duration_min: 45, price: 18000, color: '#22c55e', description: 'Limpieza profesional con ultrasonido, remoción de sarro y pulido.' },
      { name: 'Blanqueamiento dental', duration_min: 60, price: 45000, color: '#eab308', description: 'Blanqueamiento en consultorio con gel y luz LED. Resultados en una sesión.' },
      { name: 'Arreglo de caries', duration_min: 45, price: 22000, color: '#a855f7', description: 'Remoción de caries y restauración con composite del color del diente.' },
      { name: 'Extracción simple', duration_min: 30, price: 20000, color: '#ef4444', description: 'Extracción de pieza dental con anestesia local.' },
      { name: 'Consulta de ortodoncia', duration_min: 40, price: 15000, color: '#f97316', description: 'Evaluación para brackets o alineadores y presupuesto del tratamiento.' },
      { name: 'Kit de higiene dental', kind: 'product', duration_min: 30, price: 8000, color: '#6366f1', stock: 20, description: 'Cepillo, pasta e hilo dental profesional para mantener tu higiene en casa.' },
    ],
    business_hours: HOURS_SALUD,
  },

  // ─────────────────────────────── ESTÉTICA / SPA ───────────────────────────────
  {
    key: 'estetica',
    label: 'Estética / Spa / Belleza',
    emoji: '💆‍♀️',
    description: 'Centros de estética y spa. Recomienda servicios, agenda turnos y pide seña para reservar.',
    vertical: 'turnos',
    agent_name: 'Valen',
    tone: 'cercano, entusiasta y prolijo',
    system_prompt: `Sos Valen, la asistente del centro de estética. Atendés por WhatsApp 24/7 para reservar turnos, recomendar tratamientos e informar precios y duración.

REGLAS:
- Recibí con energía y preguntá qué tratamiento le interesa o qué necesita resolver.
- Recomendá el servicio adecuado de la lista según lo que pida la clienta (no inventes servicios que no están).
- Informá precio y duración de cada servicio cuando lo pregunten (está en el catálogo).
- Para reservar: ofrecé los horarios disponibles y, al confirmar, mencioná que se solicita una seña para dejar el turno agendado.
- Si preguntan por productos (crema, sérum), informá precio y beneficios; esos se venden, no se agendan.
- Si la consulta es médica o sobre una condición de la piel, aclará que eso lo evalúa la profesional en el lugar y ofrecé agendar una valoración.
- Tono amable, cercano y motivador, sin exagerar promesas de resultados.`,
    greeting_message: '¡Holaa! ✨ Soy Valen, de tu centro de estética. ¿Querés reservar un turno? Contame qué te gustaría hacerte 💆‍♀️',
    handoff_message: 'Te conecto con una de las chicas del equipo para verlo en detalle. ¡Ya te atienden! 💕',
    faqs: [
      { q: '¿Cómo dejo reservado el turno?', a: 'Para confirmar el turno pedimos una seña; el resto lo abonás en el local. Así nos aseguramos de guardarte el horario.' },
      { q: '¿Cuánto sale cada tratamiento?', a: 'Cada servicio tiene su precio y duración; decime cuál te interesa y te paso el detalle.' },
      { q: '¿Puedo reprogramar?', a: '¡Sí! Avisame con anticipación y te reubico en otro horario.' },
      { q: '¿Atienden sin turno?', a: 'Trabajamos con turno para poder dedicarte el tiempo completo. Te lo agendo ahora mismo.' },
    ],
    services: [
      { name: 'Limpieza facial profunda', duration_min: 60, price: 22000, color: '#a855f7', description: 'Higiene facial completa con extracción, exfoliación e hidratación según tu tipo de piel.' },
      { name: 'Depilación definitiva (sesión)', duration_min: 30, price: 15000, color: '#22c55e', description: 'Sesión con tecnología láser/IPL que reduce el vello de forma progresiva. Precio por zona a confirmar.' },
      { name: 'Masaje relajante', duration_min: 60, price: 20000, color: '#f97316', description: 'Masaje corporal descontracturante con aceites para liberar tensión y relajar.' },
      { name: 'Tratamiento corporal reductor', duration_min: 45, price: 25000, color: '#eab308', description: 'Sesión reductora con aparatología y maniobras para modelar y mejorar la piel.' },
      { name: 'Manicura', duration_min: 45, price: 12000, color: '#ec4899', description: 'Esmaltado tradicional o semipermanente, con limado, cutículas e hidratación de manos.' },
      { name: 'Lifting de pestañas', duration_min: 90, price: 28000, color: '#38bdf8', description: 'Curvado y fijación de las pestañas naturales con tinte incluido. Dura entre 6 y 8 semanas.' },
      { name: 'Crema hidratante facial', kind: 'product', duration_min: 30, price: 9500, color: '#6366f1', stock: 20, description: 'Crema de hidratación profunda para uso diario. Textura ligera, rápida absorción.' },
    ],
    business_hours: HOURS_ESTETICA,
  },

  // ─────────────────────────────── PELUQUERÍA / BARBERÍA ───────────────────────────────
  {
    key: 'peluqueria',
    label: 'Peluquería / Barbería',
    emoji: '✂️',
    description: 'Peluquerías y barberías. Agenda cortes y color rápido, llena huecos de agenda y confirma turnos.',
    vertical: 'turnos',
    agent_name: 'Tomi',
    tone: 'canchero, amable y directo',
    system_prompt: `Sos Tomi, el asistente de la peluquería/barbería. Reservás turnos por WhatsApp al toque, las 24 horas, para que no se pierda ningún cliente.

REGLAS:
- Saludá corto y al grano: preguntá qué se quiere hacer (corte, corte + barba, color, brushing).
- Ofrecé los horarios libres según la duración del servicio. Si pide un día/hora que no hay, proponé el más cercano.
- Confirmá nombre y horario al cerrar el turno.
- Si preguntan por productos (aceite, pomada), informá precio y características; esos se venden, no se agendan.
- Si preguntan precios, pasá los del catálogo. No inventes promos.
- Mantené un tono relajado, canchero pero respetuoso. Mensajes breves, estilo WhatsApp.`,
    greeting_message: '¡Buenas! ✂️ Soy Tomi, de la peluquería. ¿Reservamos un turno? ¿Qué te hacés?',
    handoff_message: 'Te paso con el equipo para coordinar bien. ¡Ahí te responden! 🙌',
    faqs: [
      { q: '¿Cuánto sale el corte?', a: 'Te paso la lista: cada servicio tiene su precio. ¿Qué te querés hacer?' },
      { q: '¿Cuánto tardan?', a: 'Un corte son unos 30 min; corte + barba, 45 min; color, alrededor de 90 min.' },
      { q: '¿Puedo elegir profesional?', a: 'Sí, decime con quién te gusta atenderte y fijo según su disponibilidad.' },
      { q: '¿Cómo cancelo?', a: 'Avisame y liberamos el turno para otra persona. ¡Sin drama!' },
    ],
    services: [
      { name: 'Corte de pelo', duration_min: 30, price: 8000, color: '#38bdf8', description: 'Corte personalizado a tijera y máquina, lavado y peinado final.' },
      { name: 'Corte + barba', duration_min: 45, price: 11000, color: '#eab308', description: 'Corte de cabello + perfilado y arreglo de barba con toalla caliente.' },
      { name: 'Color', duration_min: 90, price: 25000, color: '#f97316', description: 'Coloración o cobertura de canas con productos profesionales. Incluye lavado y secado.' },
      { name: 'Brushing', duration_min: 40, price: 9000, color: '#ec4899', description: 'Lavado, secado y peinado con secador y cepillo para un acabado prolijo.' },
      { name: 'Perfilado de barba', duration_min: 20, price: 5000, color: '#6366f1', description: 'Delineado y arreglo de barba con navaja, toalla caliente y aceite.' },
      { name: 'Pomada modeladora matte', kind: 'product', duration_min: 30, price: 6500, color: '#6366f1', stock: 15, description: 'Pomada al agua, fijación fuerte y acabado mate. No deja residuos grasos.' },
    ],
    business_hours: HOURS_PELUQUERIA,
  },

  // ─────────────────────────────── GIMNASIO / PERSONAL ───────────────────────────────
  {
    key: 'gimnasio',
    label: 'Gimnasio / Personal trainer',
    emoji: '💪',
    description: 'Gimnasios y entrenadores. Reserva clases y sesiones, ofrece clase de prueba y vende planes mensuales.',
    vertical: 'turnos',
    agent_name: 'Mati',
    tone: 'motivador, energético y directo',
    system_prompt: `Sos Mati, el asistente del gimnasio y centro de entrenamiento. Atendés por WhatsApp 24/7 para reservar clases y sesiones, informar planes y motivar a la gente a arrancar.

REGLAS:
- Saludá con energía y preguntá qué busca (probar el gym, entrenar, una clase puntual, un plan).
- Para reservar: ofrecé los horarios disponibles de la clase o sesión según su duración. La clase de prueba es gratuita.
- Si preguntan por el plan mensual o productos, informá precio y qué incluye; el plan y la botella se venden, no se agendan.
- NUNCA des indicaciones médicas ni rutinas personalizadas por chat: eso lo arma el profesor en la evaluación o sesión.
- Si alguien menciona una lesión o dolor, sugerí la sesión de kinesiología o derivá a un humano.
- Tono motivador y directo, sin presionar. Mensajes breves, estilo WhatsApp, con energía.`,
    greeting_message: '¡Buenas! 💪 Soy Mati, del gimnasio. ¿Querés reservar una clase o probar el gym? ¡Contame!',
    handoff_message: 'Te paso con alguien del equipo para coordinarlo bien. ¡Ahí te responden! 🙌',
    faqs: [
      { q: '¿Puedo probar antes de anotarme?', a: '¡Sí! La primera clase es gratis. Te la agendo así conocés el gym y al equipo.' },
      { q: '¿Qué incluye el plan mensual?', a: 'El plan mensual libre te da acceso ilimitado a todas las clases del mes. Te paso el detalle si querés.' },
      { q: '¿Tienen personal trainer?', a: 'Sí, ofrecemos sesiones de personal training individuales. Antes hacemos una evaluación física para armar tu plan.' },
      { q: '¿Atienden lesiones?', a: 'Tenemos kinesiología deportiva para recuperación y prevención. Si tenés una molestia, te agendo una sesión.' },
    ],
    services: [
      { name: 'Clase de prueba gratuita', duration_min: 45, price: 0, color: '#22c55e', description: 'Primera clase sin cargo para conocer el gimnasio y al equipo.' },
      { name: 'Evaluación física inicial', duration_min: 40, price: 8000, color: '#38bdf8', description: 'Medición de composición corporal y objetivos para armar tu plan.' },
      { name: 'Sesión de personal training', duration_min: 60, price: 12000, color: '#ef4444', description: 'Entrenamiento individual con profesor según tus objetivos.' },
      { name: 'Clase de funcional', duration_min: 60, price: 5000, color: '#f97316', description: 'Entrenamiento funcional grupal de fuerza y resistencia.' },
      { name: 'Clase de spinning', duration_min: 45, price: 5000, color: '#a855f7', description: 'Ciclismo indoor con música y distintos niveles de intensidad.' },
      { name: 'Kinesiología deportiva', duration_min: 45, price: 14000, color: '#eab308', description: 'Recuperación y prevención de lesiones con el kinesiólogo.' },
      { name: 'Plan mensual libre', kind: 'product', duration_min: 30, price: 25000, color: '#6366f1', description: 'Acceso ilimitado a todas las clases del mes.' },
    ],
    business_hours: HOURS_GYM,
  },
]

export function getPreset(key: string): IndustryPreset | undefined {
  return PRESETS.find((p) => p.key === key)
}
