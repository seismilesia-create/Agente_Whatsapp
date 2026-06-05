# BUSINESS_LOGIC.md - Agente WhatsApp (Atención & Ventas IA)

> Generado por SaaS Factory | Fecha: 2026-06-02
> Plataforma SaaS multi-tenant de agentes conversacionales de WhatsApp con IA (Claude) + dashboard de supervisión humana.

---

## 1. Problema de Negocio

**Dolor:** Los negocios locales (clínicas, gimnasios, inmobiliarias, comercios, instituciones gubernamentales) atienden WhatsApp de forma manual. Resultado: respuestas lentas o fuera de horario, pérdida de prospectos en el "impulso de compra", errores de agenda (overbooking) y personal saturado respondiendo lo mismo una y otra vez.

**Costo actual:**
- Leads perdidos por no responder al instante (especialmente fuera de horario / fines de semana).
- Horas-hombre gastadas en preguntas repetitivas (precios, horarios, FAQs).
- Errores humanos en la agenda → sobre-reservas y cancelaciones mal gestionadas.
- Imposibilidad de escalar la atención sin contratar más personal.

---

## 2. Solución

**Propuesta de valor:** Una plataforma SaaS multi-tenant que despliega agentes conversacionales de WhatsApp impulsados por Claude, capaces de atender, calificar y vender/agendar 24/7 de forma autónoma — con un dashboard donde el dueño del negocio supervisa, mide el ROI ("Bot en Pausa") e interviene manualmente cuando hace falta.

**Agnóstico al sector** — la misma base tecnológica se adapta por configuración (sin tocar código) a 3 verticales:
- 🛒 **Ventas** (MVP inicial): responde dudas de productos/precios/políticas y califica leads.
- 📅 **Turnos/Servicios**: consulta disponibilidad y agenda con sincronización a Google Calendar.
- 🏛️ **Atención institucional**: Q&A sobre trámites y preguntas institucionales (gobierno/instituciones).

**Flujo principal (Happy Path) — Vertical Ventas (MVP):**
1. El cliente final escribe al WhatsApp del negocio → Meta Cloud API dispara el webhook.
2. El sistema identifica la `Organization` por el número receptor y resuelve el `Contact` (nuevo vs recurrente).
3. Se arma el contexto: System Prompt del negocio + FAQs + historial de la `Conversation` + datos de catálogo.
4. Claude genera la respuesta (razonamiento, intención, calificación del lead) y se envía por WhatsApp.
5. Todo se persiste en Supabase; el dashboard muestra el chat en vivo, diferenciando mensajes de IA vs humano.
6. Si el caso supera al bot (o el operador activa el **toggle de pausa**), interviene un humano desde el dashboard.

**Flujo extendido — Vertical Turnos (fase posterior):**
`...consulta disponibilidad → calcula slots según duración del servicio → confirma → crea evento en Google Calendar (única fuente de verdad) → guarda Appointment.`

---

## 3. Usuario Objetivo

**Roles:**
- **Operador del SaaS (nuestro cliente que paga):** dueño/gerente de un negocio local o responsable de atención de una institución, que quiere automatizar WhatsApp sin saber de tecnología.
- **Agente humano:** recepcionista/vendedor que supervisa los chats y toma el control en casos VIP o excepcionales.
- **Cliente final (no usa el dashboard):** la persona que escribe por WhatsApp al negocio.

**Contexto:** Negocios y organismos que reciben alto volumen de consultas repetitivas por WhatsApp y no pueden (o no quieren) escalar atención humana 24/7.

---

## 4. Arquitectura de Datos

**Input:**
- Mensajes entrantes de WhatsApp (texto, eventualmente media) vía Meta Cloud API webhook.
- Configuración del negocio cargada en el dashboard: System Prompt, tono, FAQs, datos (nombre, dirección, horarios), catálogo/servicios, mensajes de flujo (saludo, transferencia a humano).
- Acciones del operador: toggle de pausa, mensajes manuales, edición de config.

**Output:**
- Respuestas automáticas de la IA enviadas por WhatsApp.
- Dashboard: KPIs (conversaciones 30 días, "Bot en Pausa", resueltas por IA vs humano), historial conversacional diferenciado por color, agenda (en vertical turnos).
- (Fase turnos) Eventos en Google Calendar.

**Storage (Supabase tables — multi-tenant con RLS por `organization_id`):**
- `organizations`: la cuenta/tenant. Nombre, vertical (ventas|turnos|institucional), plan, estado.
- `profiles`: usuarios del dashboard (operadores/agentes) ligados a `auth.users`, con `organization_id` y rol.
- `whatsapp_config`: credenciales y parámetros del número de WhatsApp por organización (phone_number_id, tokens cifrados, verify_token). **Tokens cifrados** (gen-encryption-key.mjs).
- `business_config`: identidad del agente (system prompt, tono), FAQs, datos del negocio, mensajes de flujo, duración de servicios (para slots).
- `contacts`: clientes finales por organización. Teléfono, nombre, estado (nuevo|recurrente), metadata.
- `conversations`: hilo de chat por contacto. Estado del bot (activo|pausado), último mensaje, asignación.
- `messages`: cada mensaje de una conversación. Dirección (inbound|outbound), origen (ai|human|contact), contenido, timestamp.
- `appointments` (fase turnos): turnos agendados, servicio, slot, estado, vínculo a Google Calendar event.

> RLS: cada fila lleva `organization_id`; las policies garantizan que un operador solo ve datos de SU organización.

---

## 5. KPI de Éxito

**Métrica principal del MVP:** Un negocio configura su agente de ventas desde el dashboard y el bot responde correctamente una consulta de producto/precio de punta a punta (WhatsApp → IA → WhatsApp), quedando registrada y visible en el historial diferenciado, con la capacidad de pausar el bot e intervenir manualmente.

**Métricas de producto (dashboard):**
- % de conversaciones resueltas por IA sin intervención humana.
- Cantidad de interacciones con "Bot en Pausa" (justificación de ROI).
- Volumen de conversaciones / 30 días.

---

## 6. Especificación Técnica (Para el Agente)

### Decisiones de arquitectura confirmadas
- **Multi-tenant desde el día 1** (RLS por `organization_id`).
- **MVP = vertical Ventas**, arquitectura agnóstica para sumar Turnos e Institucional por configuración.
- **WhatsApp connector mockeado** al inicio (interfaz `WhatsAppProvider`), con implementación real de **Meta Cloud API** lista para enchufar al obtener credenciales. La librería no oficial NO se usa.
- **Modelo de IA:** Claude vía API. Usar el modelo Opus más reciente (`claude-opus-4-8`) — el informe mencionaba "Claude 3.5 Opus", que está desactualizado.

### Features a Implementar (Feature-First)
```
src/features/
├── auth/             # Autenticación Email/Password (Supabase) + creación de Organization
├── organizations/    # Tenant: alta, miembros, settings de la cuenta
├── config/           # Configuración del negocio: system prompt, FAQs, datos, mensajes de flujo
├── conversations/    # Historial de chats, diferenciación IA/humano, toggle de pausa, envío manual
├── dashboard/        # KPIs y analytics (Bot en Pausa, resueltas IA vs humano)
├── whatsapp/         # Provider (mock + Meta Cloud API), webhook handler, envío de mensajes
├── ai-agent/         # Orquestación de Claude: armado de contexto, razonamiento, respuesta
└── appointments/     # (Fase posterior) Slots + Google Calendar
```

### Stack Confirmado
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui
- **Backend:** Supabase (Auth + Database + Storage + RLS)
- **IA:** Claude API (`claude-opus-4-8`) — vía Vercel AI SDK / Anthropic SDK
- **WhatsApp:** Meta Business / Cloud API (oficial) — conector mockeado hasta tener credenciales
- **Calendar (fase turnos):** Google Calendar OAuth
- **Validación:** Zod | **State:** Zustand (si necesario)
- **Seguridad:** cifrado de tokens (gen-encryption-key.mjs), RLS estricto
- **MCPs:** Next.js DevTools + Playwright + Supabase

### Próximos Pasos (roadmap por fases)
1. [x] **Setup base:** `npm install`, conectar Supabase, variables de entorno, design system Bento-Grid. ✅ (2026-06-03)
2. [x] **Fase 1 — Fundación (PRIMER ENTREGABLE):** Auth Email/Password + alta de Organization (multi-tenant) + Dashboard shell + pantalla de Configuración del negocio (system prompt, FAQs, datos, mensajes de flujo). ✅ Verificado E2E (2026-06-03)
3. [x] **Fase 2 — Esquema de datos:** todas las tablas con RLS por organización (organizations, profiles, business_config, whatsapp_config, contacts, conversations, messages). ✅ Migraciones 0001 + 0002 aplicadas (2026-06-03)
4. [ ] **Fase 3 — Conector WhatsApp (mock):** interfaz `WhatsAppProvider`, webhook handler, simulador para probar sin credenciales.
5. [ ] **Fase 4 — Agente IA:** orquestación de Claude (contexto + FAQs + historial), calificación nuevo vs recurrente, respuesta automática.
6. [ ] **Fase 5 — Bandeja de conversaciones:** historial diferenciado por color (IA/humano), toggle de pausa, envío manual.
7. [ ] **Fase 6 — Analytics:** KPIs "Bot en Pausa", resueltas IA vs humano, volumen 30 días.
8. [ ] **Fase 7 — Meta Cloud API real:** enchufar credenciales, cifrado de tokens, verificación de webhook.
9. [ ] **Fase 8 — Vertical Turnos:** appointments + slots + Google Calendar OAuth (única fuente de verdad).
10. [ ] **Testing E2E (Playwright) + Deploy (Vercel).**
```
