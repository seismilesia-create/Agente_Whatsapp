# Cómo funciona Meta WhatsApp en este proyecto

> Guía práctica para entender el número, el token y el webhook de WhatsApp,
> evitar el problema del token vencido, y saber qué falta para producción.
> Última actualización: 2026-06-07

---

## 1. Las 3 piezas (no confundirlas)

Cuando trabajás con WhatsApp Cloud API de Meta hay **tres cosas distintas**:

| Pieza | Qué es | ¿Se vence? | Dónde vive en el proyecto |
|-------|--------|------------|---------------------------|
| **Número de prueba** | El teléfono que Meta presta para probar (el que recibe los mensajes) | ❌ No | `WHATSAPP_TEST_PHONE_NUMBER_ID` |
| **Token de acceso** | La "llave" que la app usa para **enviar** respuestas vía ese número | ⚠️ Depende (ver abajo) | `WHATSAPP_TEST_ACCESS_TOKEN` |
| **Verify token** | Palabra clave para que Meta conecte el webhook (la elegís vos) | ❌ No | `WHATSAPP_VERIFY_TOKEN` |

> ⚠️ **El que se vence NO es el número. Es el TOKEN.** El número gratis sigue
> funcionando; lo que caduca es la llave para enviar mensajes.

---

## 2. El problema del token vencido (lo que nos pasó)

### Tipos de token

| Tipo de token | De dónde sale | Duración |
|---------------|---------------|----------|
| **Temporal** | Pantalla "API Setup" del panel de la app (el que se copia al inicio) | **24 horas** ❌ |
| **Permanente** | **Usuario del sistema** (System User) en Configuración del negocio | **No vence** ✅ |

### Qué pasó el 5–7 de junio 2026

1. Se cargó un **token temporal** el 5/6 → funcionó.
2. El **5/6 a las 18:00** el token cumplió sus 24 hs y **venció**.
3. Desde ahí: los mensajes de la gente **seguían llegando** a la app y el agente
   **seguía generando** la respuesta… pero al **enviarla**, Meta la rechazaba con
   `OAuthException code 190` ("Session has expired") → **el cliente no recibía nada**.

> Detalle que lo hizo invisible: el código guardaba la respuesta como "enviada" en
> la base aunque Meta la rechazara (no chequeaba el resultado del envío). Por eso en
> el dashboard "parecía" que respondía. Ver `src/features/whatsapp/runner.ts`.

### La solución de raíz: token PERMANENTE

Generar un **token de Usuario del sistema**, que no vence. **Se puede hacer ya, con el
número gratis** (no hace falta número real).

**Pasos en Meta:**
1. [business.facebook.com](https://business.facebook.com) → **Configuración del negocio**
2. **Usuarios → Usuarios del sistema** → **Agregar** (rol *Admin*)
3. Asignar la **app de WhatsApp** como activo (botón "Agregar activos")
4. **Generar nuevo token** → elegir la app → permisos:
   `whatsapp_business_messaging` + `whatsapp_business_management` → **Vencimiento: Nunca**
5. Copiar el token (empieza con `EAA…`)

**Cargarlo en el proyecto (Vercel) y redeploy:**
```bash
vercel env rm WHATSAPP_TEST_ACCESS_TOKEN production
vercel env add WHATSAPP_TEST_ACCESS_TOKEN production   # pegar el token nuevo
vercel --prod                                          # redeploy (sin esto NO toma el cambio)
```
> Cambiar la variable de entorno **no aplica hasta el redeploy**.

---

## 3. Limitaciones del número de prueba gratis

El número gratis sirve para demos, pero tiene límites (son del **número**, no del token):

- **Solo le podés escribir a hasta 5 números** que cargás a mano en el panel de Meta
  (lista de destinatarios permitidos). Ideal para demos a personas puntuales.
- **Límite de mensajes diarios** bajo hasta verificar el negocio.
- No sirve para que **cualquier** cliente final escriba: para eso → número propio.

| Querés… | Necesitás… |
|---------|------------|
| Que el token no venza cada 24 hs | Token permanente (ya, con número gratis) |
| Que cualquier cliente escriba (no solo 5) | Número propio + verificar el negocio en Meta |

---

## 4. Cómo funciona el webhook en este proyecto

```
Cliente escribe por WhatsApp
        ↓
Meta envía un POST al webhook  →  /api/whatsapp   (src/app/api/whatsapp/route.ts)
        ↓
runner.ts (handleIncomingWhatsApp):
   1. Parsea el mensaje entrante
   2. Verifica que sea el número de prueba (WHATSAPP_TEST_PHONE_NUMBER_ID)
   3. Resuelve qué agente responde → tabla whatsapp_channels (switch de demo)
   4. Guarda contacto + conversación + mensaje entrante
   5. Corre el agente IA (config + catálogo + agenda del negocio)
   6. Envía la respuesta a Meta con el token  ← acá fallaba si el token venció
```

**Configuración del webhook en Meta** (panel de la app → WhatsApp → Configuración):
- **Callback URL:** `https://<tu-dominio-vercel>/api/whatsapp`
- **Verify token:** el mismo valor de `WHATSAPP_VERIFY_TOKEN`
- **Suscribirse al campo** `messages`

### El "Modo demo" (un número, varios rubros)

Hoy hay **un solo número de prueba** y un **switch** (`/demo`) para elegir qué agente
(rubro) responde en cada presentación. La elección se guarda en la tabla
`whatsapp_channels` (`active_organization_id`). El runner lee esa tabla para saber a
qué negocio enrutar el mensaje.

---

## 5. Variables de entorno (dónde está cada valor)

| Variable | Para qué |
|----------|----------|
| `WHATSAPP_TEST_PHONE_NUMBER_ID` | ID del número de prueba de Meta |
| `WHATSAPP_TEST_ACCESS_TOKEN` | Token para enviar mensajes (← el que hay que volver permanente) |
| `WHATSAPP_VERIFY_TOKEN` | Palabra clave para conectar el webhook |

Viven en **`.env.local`** (desarrollo) y en **Vercel → Settings → Environment Variables**
(producción). **Hay que mantener ambos sincronizados** cuando se renueva el token.

---

## 6. Checklist: "el agente no responde por WhatsApp"

Diagnóstico rápido en orden:

1. **¿El token está vivo?** Probarlo contra Meta:
   ```bash
   curl -s "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>?access_token=<TOKEN>"
   ```
   Si dice `OAuthException code 190 / Session has expired` → **token vencido** → renovar (sección 2).
2. **¿Llegan los mensajes entrantes?** Revisar la tabla `messages` (`direction = 'inbound'`).
   Si llegan → el webhook anda; el problema es el **envío** (casi siempre el token).
3. **¿Hay un agente activo en el switch?** Revisar `whatsapp_channels.active_organization_id`.
   Si está vacío → activar un rubro desde `/demo`.
4. **¿El cambio de env var se redeployó?** Las variables nuevas en Vercel **no aplican**
   hasta hacer `vercel --prod`.
5. **¿El destinatario está en la lista permitida?** (Solo aplica con número de prueba gratis).

---

## 7. Camino a producción (resumen)

| Etapa | Qué hacer |
|-------|-----------|
| **Hoy (demo)** | Número gratis + **token permanente** + lista de hasta 5 destinatarios |
| **Producción** | Número propio + **verificación del negocio** en Meta (sube los límites y permite que cualquier cliente escriba) |
| **Escala** | Más números / más negocios; el costo de Meta es por conversación (se traslada al precio del cliente) |

---

*Documento de referencia del proyecto. Si el token vuelve a vencerse, no debería pasar
con el permanente — pero si pasa, seguir la sección 6.*
