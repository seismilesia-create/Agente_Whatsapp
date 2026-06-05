/**
 * Tipos de dominio que reflejan el esquema de Supabase (migración 0001_init.sql).
 * Mantener en sync con la migración. Más adelante se puede autogenerar con
 * `supabase gen types` vía MCP (generate_typescript_types).
 */

export type OrgVertical = 'ventas' | 'turnos' | 'institucional'
export type ProfileRole = 'owner' | 'agent'
export type ContactStatus = 'new' | 'recurrent'
export type ConversationStatus = 'open' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageSource = 'ai' | 'human' | 'contact'
export type WhatsAppStatus = 'disconnected' | 'pending' | 'connected'
export type AppointmentStatus = 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type CatalogKind = 'service' | 'product'
export type MediaType = 'image' | 'video'

export interface Organization {
  id: string
  name: string
  vertical: OrgVertical
  plan: string
  created_at: string
}

export interface Profile {
  id: string
  organization_id: string
  email: string | null
  full_name: string | null
  role: ProfileRole
  created_at: string
}

export interface Faq {
  q: string
  a: string
}

export interface BusinessConfig {
  id: string
  organization_id: string
  agent_name: string
  system_prompt: string
  tone: string
  business_name: string | null
  address: string | null
  faqs: Faq[]
  greeting_message: string
  handoff_message: string
  default_service_duration_min: number
  updated_at: string
  created_at: string
}

export interface WhatsAppConfig {
  id: string
  organization_id: string
  phone_number_id: string | null
  display_phone_number: string | null
  verify_token: string | null
  access_token_encrypted: string | null
  status: WhatsAppStatus
  updated_at: string
  created_at: string
}

export interface Contact {
  id: string
  organization_id: string
  phone: string
  name: string | null
  status: ContactStatus
  metadata: Record<string, unknown>
  created_at: string
}

export interface Conversation {
  id: string
  organization_id: string
  contact_id: string
  bot_paused: boolean
  status: ConversationStatus
  assigned_to: string | null
  last_message_at: string
  created_at: string
}

export interface Message {
  id: string
  organization_id: string
  conversation_id: string
  direction: MessageDirection
  source: MessageSource
  content: string
  created_at: string
}

/** Característica flexible de un ítem del catálogo (ej. {label:'Talle', value:'M'}). */
export interface CatalogAttribute {
  label: string
  value: string
}

export interface CatalogMedia {
  id: string
  organization_id: string
  service_id: string
  url: string
  path: string
  type: MediaType
  sort: number
  created_at: string
}

/**
 * Ítem del catálogo (tabla `services`). Puede ser un servicio (con duración, para turnos)
 * o un producto (con stock). `attributes` son características libres; `media` son fotos/videos.
 */
export interface Service {
  id: string
  organization_id: string
  kind: CatalogKind
  name: string
  description: string
  duration_min: number
  price: number
  stock: number | null
  attributes: CatalogAttribute[]
  active: boolean
  created_at: string
}

export type CatalogItem = Service
export interface CatalogItemWithMedia extends Service {
  media: CatalogMedia[]
}

export interface BusinessHour {
  id: string
  organization_id: string
  weekday: number // 0=domingo … 6=sábado
  open_time: string // 'HH:MM:SS'
  close_time: string
}

export interface Appointment {
  id: string
  organization_id: string
  contact_id: string | null
  service_id: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  notes: string | null
  google_event_id: string | null
  created_at: string
  updated_at: string
}
