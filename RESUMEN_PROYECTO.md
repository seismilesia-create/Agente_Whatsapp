# Resumen del Proyecto — Agente de WhatsApp (SaaS)

> Documento de trabajo para discutir el modelo de negocio, la arquitectura
> y el camino de la app de muestra (demo) a producción.
> Última actualización: 2026-06-06

---

## 1. Qué es el producto

Un **SaaS de agentes de WhatsApp con IA para negocios**. Cada negocio (peluquería,
consultorio, comercio, etc.) tiene un asistente que responde automáticamente a sus
clientes por WhatsApp: contesta consultas, muestra catálogo, agenda turnos, etc.

El negocio configura su agente desde un **dashboard web**, sin tocar nada técnico.

**Verticales soportadas** (tipo de negocio):
- `ventas` — comercios que venden productos
- `turnos` — negocios que agendan citas (peluquerías, consultorios)
- `institucional` — atención informativa

---

## 2. Cómo está armada la app (arquitectura)

### Concepto central: Multi-Tenancy (multi-cliente compartido)

> **UNA sola app + UNA sola base de datos atienden a TODOS los clientes.**
> NO hay una app ni una base por cliente.

Cada cliente/negocio es una fila en la tabla `organizations`. Toda la información
(conversaciones, catálogo, config, turnos) lleva una columna `organization_id`, y las
políticas de seguridad **RLS (Row Level Security)** de la base de datos garantizan que
**un cliente jamás vea los datos de otro**. Es el mismo modelo que usan Slack, Notion
o Shopify.

**Consecuencia clave de negocio:** el costo fijo de infraestructura casi no sube
cuando entran clientes nuevos. Lo que crece es el *uso* (tráfico, IA, WhatsApp), de
forma gradual.

### Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos + Auth | Supabase (Postgres + RLS) |
| Motor de IA | Claude (vía OpenRouter / Vercel AI SDK) |
| Hosting / Deploy | Vercel |
| Mensajería | WhatsApp / Meta Cloud API |

### Modelo de datos (tablas principales, todas aisladas por `organization_id`)

- `organizations` — el cliente/negocio (tenant). Tiene `vertical` y `plan`.
- `profiles` — usuarios que entran al dashboard (ligados a la org, con rol).
- `business_config` — configuración del agente: system prompt, tono, FAQs, datos.
- `whatsapp_config` — credenciales del número de WhatsApp (tokens cifrados).
- `contacts` — los clientes finales del negocio.
- `conversations` — hilos de chat (incluye flag `bot_paused` para intervención humana).
- `messages` — cada mensaje, diferenciando si lo generó la IA, un humano o el contacto.
- `services` — catálogo de productos/servicios (precio, stock, duración).
- `catalog_media` — fotos/videos del catálogo.
- `appointments` + `business_hours` — turnos y horarios (vertical turnos).

### Autenticación y onboarding

- Login con Email/Contraseña (Supabase Auth).
- Al registrarse, un trigger crea automáticamente la organización, el perfil y la
  config base. El cliente entra y ya tiene su espacio listo para configurar.

### El agente de IA

- Por cada negocio, el sistema arma un "system prompt" inyectando: su prompt
  personalizado, sus datos, su catálogo y sus FAQs.
- El agente tiene "herramientas": consultar disponibilidad, reservar turno, enviar
  material del catálogo.

### Dashboards existentes (por cliente)

Cada negocio ve **solo lo suyo** (aislado por RLS):
- **Dashboard** — KPIs (conversaciones, % resuelto por IA, contactos, etc.)
- **Conversaciones** — bandeja con historial (IA / humano / cliente diferenciados)
- **Configuración** — prompt, tono, FAQs, datos del negocio
- **Catálogo** — productos/servicios + fotos
- **Agenda** — turnos (vertical turnos)
- **Conexión WhatsApp** — estado del número
- **Simulador** — probar el agente sin conectar WhatsApp real

---

## 3. Estado actual: app de MUESTRA (demo) vs PRODUCCIÓN

### ✅ Lo que YA está hecho (demo funcional)

- Arquitectura multi-tenant completa con RLS desde el día 1.
- Login + registro + onboarding automático.
- Esquema de base de datos completo (migraciones 0001–0004).
- Dashboard con KPIs.
- Configuración del agente (prompt, FAQs, datos).
- Catálogo (productos/servicios + media).
- Agente de IA funcionando con herramientas.
- **Simulador** para probar el agente sin WhatsApp real.

### 🔨 Lo que FALTA para pasar a producción

- [ ] **Conexión real con Meta Cloud API** (hoy se prueba con el simulador).
- [ ] **Bandeja de conversaciones** terminada (toggle "pausar bot" para que atienda
      un humano).
- [ ] **Sincronización con Google Calendar** (estructura lista, falta conectar).
- [ ] **Dashboard de Administrador General** (el tuyo) — ver punto 5.
- [ ] **Analytics completo.**
- [ ] **Deploy a producción** (Supabase Pro + Vercel Pro) y testing end-to-end.

---

## 4. Modelo de negocio: suscripciones

### Decisión tomada

> **Todos los clientes viven SIEMPRE en TU infraestructura compartida.**
> Los planes se diferencian por **features, soporte y recursos** — NUNCA por
> "de quién es la cuenta de Supabase/Vercel".

**Por qué NO darle a cada cliente su propio Supabase/Vercel:**
1. Rompe la arquitectura multi-tenant (habría que clonar la app entera por cliente).
2. Mantenimiento inmanejable (re-desplegar y migrar N veces por cada cambio).
3. El cliente (no técnico) no puede administrar infraestructura → te genera más
   soporte, no menos.
4. Perdés el control, el monitoreo y la economía de escala.

> Nota: "entregarle el sistema a nombre del cliente" es otro negocio distinto
> (white-label / agencia), de pago único, que NO escala. No mezclar con el SaaS.

### Estructura de planes propuesta

```
PLAN BÁSICO ........... ~$20-25/mes
  · Agente de WhatsApp + dashboard
  · Soporte estándar
  · Infra compartida (tuya)

PLAN PRO .............. ~$40-50/mes
  · Todo lo del básico
  · Soporte prioritario (resolución inmediata)  ← el "premium" es el SOPORTE
  · Más volumen de mensajes incluido
  · Algún add-on incluido

ADD-ONS (sobre cualquier plan):
  · Confirmación / recordatorio de turno ..... +$X/mes
  · Sync Google Calendar ..................... +$X/mes
  · [nuevos accesorios a medida que surjan] .. +$X/mes

SETUP / ONBOARDING ..... $100 una vez (opcional)
```

### Costos variables a cubrir en el precio (importante)

Aunque la infra sea compartida, hay costos que **sí crecen por cliente** y hay que
cubrirlos en la tarifa (o ponerle límite de uso incluido):
- **WhatsApp / Meta** — cobra por conversación.
- **Claude / OpenRouter** — cobra por cada respuesta del agente (tokens).

→ Modelar el costo por cliente y fijar el precio **por encima** de ese costo, o incluir
  "X mensajes/mes" y cobrar extra por encima.

---

## 5. Infraestructura: con qué arrancar y cuándo escalar

### Costo fijo para arrancar producción

```
Supabase Pro ........ $25/mes   (8 GB DB, 100K usuarios/mes, sin pausa, backups)
Vercel Pro .......... $20/mes   (uso comercial permitido — OBLIGATORIO al cobrar)
─────────────────────────────
Fijo de infra ....... ~$45/mes  ← atiende a TODOS los clientes
+ WhatsApp/Meta ..... variable (se traslada al precio del cliente)
+ Claude/OpenRouter . variable (se traslada al precio del cliente)
```

> ⚠️ **Vercel Hobby (gratis) NO sirve**: prohíbe el uso comercial. Al cobrar
> suscripciones, hay que estar en Vercel Pro sí o sí.
> ⚠️ **Supabase Free NO sirve para producción**: se pausa tras 1 semana de inactividad.

### Regla de escalado

> No se "cambia de plan": se **agrega capacidad dentro del mismo plan**.

| Señal que vas a ver | Qué hacés |
|---|---|
| Supabase: CPU alta / conexiones llenas | Subís el tamaño de cómputo (seguís en Pro) |
| Supabase: DB cerca de 8 GB | Add-on de disco (seguís en Pro) |
| Vercel: pasás el crédito/transferencia | Pagás overage automático (seguís en Pro) |
| Cliente corporativo pide SOC2 / SLA | Recién ahí: Supabase Team / Vercel Enterprise |

---

## 6. Dashboard de Administrador General (a construir)

Vos necesitás un panel propio (god-mode) que **todavía no existe**:

- **Vista global:** todos los negocios, métricas agregadas, estado de salud de cada
  agente (activo / caído), revenue.
- **"Entrar como" un cliente (impersonation):** poder entrar al dashboard de un
  cliente para diagnosticar problemas.

**Cómo se construye de forma segura:**
- Un campo `is_super_admin` en tu perfil.
- Lectura de cualquier organización vía el **cliente service-role** (solo del lado del
  servidor, nunca expuesto al navegador) con `organization_id` explícito.
- **NO** se tocan las políticas RLS para "dejar pasar al admin" (es frágil/peligroso).
- Toda acción de admin queda registrada en una tabla `admin_audit_log`
  (quién entró, a qué org, cuándo).

---

## 7. Próximos pasos sugeridos

1. **Tabla de precios definitiva** con costos variables modelados y punto de equilibrio.
2. **Construir el dashboard de administrador general** (god-mode + impersonation + audit log).
3. **Conexión real con Meta Cloud API** (reemplazar el simulador).
4. **Deploy a producción** (Supabase Pro + Vercel Pro) + testing end-to-end.
5. Terminar bandeja de conversaciones, Google Calendar y analytics.

---

*Documento generado para discusión en coworking. Resume las decisiones de arquitectura,
modelo de negocio e infraestructura conversadas hasta la fecha.*
