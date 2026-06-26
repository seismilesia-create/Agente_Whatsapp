# Agente WhatsApp — SaaS de agentes con IA para turnos

SaaS multi-tenant que vende **agentes de WhatsApp con IA** + dashboard de supervisión,
enfocado en **turnos / servicios locales** (salud, estética, peluquería). El agente
conversa de verdad (no son solo recordatorios): consulta disponibilidad, reserva turnos,
manda fotos/videos del catálogo y deriva a un humano cuando hace falta.

Este repo es el **muestrario / demo** para mostrar el producto a clientes potenciales.

---

## Qué incluye

**Backend del cliente** (lo que ve el negocio):
- **Dashboard** con KPIs (conversaciones, % IA vs humano, contactos, turnos)
- **Agenda** estilo Google Calendar (vistas Mes/Semana/Día, colores por servicio)
- **Productos y Servicios** — catálogo con fotos/videos
- **Conversaciones** — bandeja con toma humana (pausar/reactivar el bot)
- **Contactos / CRM** — etiquetas, opt-in, recurrencia automática
- **Configuración** — prompt del agente, tono, FAQs, horarios, datos del negocio
- **Simulador** — probá el agente sin WhatsApp real (la pieza clave para demostrar)

**Backend de super-admin** (`/admin`, god-mode): métricas globales, lista de clientes,
switch de demo por rubro, on/off por agente, toggles de features/add-ons.

**Stack:** Next.js 16 (App Router) + TypeScript · Supabase (Auth + DB + RLS + Storage) ·
Tailwind · Vercel AI SDK / OpenRouter (default `google/gemini-2.5-flash`).

---

## Setup rápido

```bash
npm install
cp .env.local.example .env.local   # completá los valores (ver abajo)
npm run dev                        # http://localhost:3000 (auto-detecta puerto)
```

Para mostrar la demo sin tocar WhatsApp/Meta, alcanza con **Supabase + OpenRouter**:
entrás al dashboard y usás el **Simulador** para conversar con el agente.

### Variables de entorno

Todas documentadas en [`.env.local.example`](.env.local.example). Mínimo para la demo:

| Bloque | Variables | ¿Obligatorio? |
|--------|-----------|---------------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Sí |
| IA | `LLM_PROVIDER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Sí |
| Sitio | `NEXT_PUBLIC_SITE_URL` | Sí |
| WhatsApp | `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_TEST_PHONE_NUMBER_ID`, `WHATSAPP_TEST_ACCESS_TOKEN` | Solo para WhatsApp en vivo |
| Google Calendar | `GOOGLE_SA_CLIENT_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` | Opcional |
| Cron | `CRON_SECRET` | Opcional |

---

## Base de datos

Migraciones en [`supabase/migrations/`](supabase/migrations/) (0001–0011), multi-tenant
con RLS por `organization_id` desde el día 1. Aplicalas en orden sobre un proyecto
Supabase limpio.

### Cuentas demo

Tres negocios de ejemplo (un rubro cada uno) para mostrar a clientes. Se siembran en
Supabase; el trigger `handle_new_user` crea org + profile + config automáticamente.

---

## Demo con WhatsApp en vivo

El webhook (`/api/whatsapp`) está cableado a Meta Cloud API. Para mostrar el agente
respondiendo a un WhatsApp real necesitás un **número de prueba** y un **token
permanente**. Guía completa paso a paso, gotchas del token vencido y checklist de
diagnóstico en **[`META_WHATSAPP.md`](META_WHATSAPP.md)**.

El **switch de demo** (`/admin`) permite que un solo número de prueba responda como
salud, estética o peluquería según lo que estés mostrando.

---

## Google Calendar (turnos espejados)

Ya está integrado: al reservar un turno (por dashboard o por el agente) se crea el evento
en un calendario compartido y se guarda el `google_event_id`; al cancelar, se borra. Los
eventos se titulan `[Nombre del negocio] Servicio — Cliente` para distinguir los rubros en
un mismo calendario. Se activa con solo completar las 3 variables `GOOGLE_*`:

1. Creá (o usá) un **Service Account** en Google Cloud con la API de Calendar habilitada.
2. **Compartí tu calendario** de demos con el email del Service Account, con permiso
   *"Hacer cambios en eventos"*.
3. Pegá el **ID del calendario** en `GOOGLE_CALENDAR_ID` y las credenciales del SA en
   `GOOGLE_SA_CLIENT_EMAIL` / `GOOGLE_SA_PRIVATE_KEY`.

---

## Documentación interna

- [`BUSINESS_LOGIC.md`](BUSINESS_LOGIC.md) — lógica de negocio, usuarios, roadmap.
- [`RESUMEN_PROYECTO.md`](RESUMEN_PROYECTO.md) — resumen ejecutivo y modelo de negocio.
- [`META_WHATSAPP.md`](META_WHATSAPP.md) — todo sobre la conexión con Meta WhatsApp.

---

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run typecheck    # Verificar tipos
npm run lint         # ESLint
```
