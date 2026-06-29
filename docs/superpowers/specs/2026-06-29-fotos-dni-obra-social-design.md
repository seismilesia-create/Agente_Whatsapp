# Fix fotos webp + DNI obligatorio + obra social

Fecha: 2026-06-29
Estado: aprobado

## Problemas / pedidos

1. **Bug fotos:** el bot dice "te mandé las fotos" pero no llegan. Causa raíz:
   las imágenes del catálogo son `.webp` y la API de mensajes de WhatsApp solo
   acepta JPEG/PNG. El envío falla en silencio (`sendWhatsAppImage` loguea y
   devuelve false; el runner no lo chequea). Hay 15 webp y 9 png cargadas: las
   png funcionan, las webp fallan siempre.
2. **DNI:** al reservar, el agente debe pedir nombre + apellido + DNI para
   individualizar al paciente/cliente. Obligatorio para reservar.
3. **Obra social:** en rubros de salud (Consultorio Demo Salud, Clínica Dental
   Sonrisa) además debe preguntar si tiene obra social y cuál. Obligatorio.

## Decisiones (con el usuario)

- Activación por **flags configurables por negocio** (no por rubro hardcodeado):
  `require_dni` (default true) y `require_insurance` (default false, true en los
  dos negocios de salud).
- DNI y obra social (cuando su flag está prendido) son **obligatorios**: el bot
  no confirma el turno hasta tenerlos.
- Fix de fotos: **conversión webp→JPEG al vuelo** vía ruta propia (cubre las
  webp existentes sin migrar archivos).

## Cambios

### A) Fotos
- `package.json`: agregar `sharp` como dependencia explícita.
- `src/app/api/media/jpeg/route.ts`: GET `?src=<url>` → valida que `src`
  pertenezca al bucket público de Supabase (`${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`),
  descarga la imagen, la transcodifica a JPEG con sharp y la devuelve con
  `Content-Type: image/jpeg` + cache. Evita proxy abierto (SSRF).
- `src/features/whatsapp/runner.ts`: al enviar un attachment imagen, si la URL
  es `.webp` la enruta por `/api/media/jpeg?src=…` (absoluta); png va directo.
  Si el envío devuelve false, manda un texto honesto ("no pude adjuntar la
  foto, el equipo te la pasa").
- `src/lib/whatsapp.ts`: `sendWhatsAppImage` ya devuelve boolean; se usa.

### B/C) DNI + obra social
- **Migración** `contacts`: `dni text`, `obra_social text`.
- **Migración** `business_config`: `require_dni boolean default true`,
  `require_insurance boolean default false`. Prender `require_insurance` en los
  dos negocios de salud.
- `src/shared/types/database.ts`: `BusinessConfig` += `require_dni`,
  `require_insurance`. `Contact`/tipos += `dni`, `obra_social` donde aplique.
- `src/features/ai-agent/agent.ts`:
  - `reservar_turno` suma params `apellido`, `dni`, `obra_social`.
  - `AgentDeps.book` recibe `dni?`, `obraSocial?`.
  - Prompt: si `require_dni`, pedir nombre+apellido+DNI antes de reservar; si
    `require_insurance`, preguntar obra social y cuál. Pasar los flags a
    `buildSystemPrompt`.
- `src/features/whatsapp/admin-data.ts` (`createAppointmentAdmin`) y
  `src/features/appointments/services.ts` (`createAppointment`): validar que,
  si el flag correspondiente está prendido, lleguen DNI / obra social; si falta,
  devolver `{ ok:false, error }` para que el bot re-pregunte. Guardar `dni` y
  `obra_social` en el contacto (upsert).
- `src/app/api/simulator/route.ts` y runner: pasar los flags de config.

### Config UI
- `src/features/config/schemas.ts`, `actions.ts`, `services.ts`,
  `components/config-form.tsx`: dos switches "Pedir DNI al reservar" y
  "Pedir obra social".

### Dónde se ve
- DNI y obra social quedan en el contacto → visibles en la ficha del cliente.

## Alcance / límites
- El DNI/obra social se guardan en el contacto; si ya están, el bot no los
  repregunta (el prompt incluye los datos ya conocidos).
- Conversión de imágenes solo en el envío (no se migran los archivos webp).
