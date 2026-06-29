# Estados de color en conversaciones + handoff real

Fecha: 2026-06-29
Estado: aprobado

## Problema

1. `derivar_a_humano` no pausaba el bot ni avisaba: la función `escalate`
   nunca se cableó en el runner de WhatsApp ni en el simulador, así que
   `deps.escalate?.()` era un no-op. El bot decía "te paso con alguien" y
   seguía respondiendo.
2. El personal que mira el dashboard no tiene forma de ver de un vistazo qué
   conversaciones necesitan atención humana, cuáles van bien y cuáles ya se
   cerraron.

## Solución

Sistema de 4 colores derivado del estado de cada conversación (sin migración:
se reutilizan `bot_paused`, `needs_human` y `status`, ya existentes).

### Estados de color (derivados, no se guardan)

Precedencia de arriba hacia abajo:

| # | Condición                                     | Color           | Significado                  |
|---|-----------------------------------------------|-----------------|------------------------------|
| 1 | `status = 'closed'`                           | 🔵 Azul         | Cerrada / resuelta           |
| 2 | `bot_paused = true` y `needs_human = false`   | 🟡 Amarillo tenue | Un humano está atendiendo   |
| 3 | `needs_human = true`                           | 🔴 Rojo         | Necesita un humano (sin tomar)|
| 4 | resto                                          | 🟢 Verde        | El bot atiende bien          |

Clave del diseño: cuando un humano toma el control se baja `needs_human`
(ya no *necesita* humano, lo *tiene*) → eso diferencia rojo de amarillo.

### Transiciones (backend)

- Bot deriva (`derivar_a_humano`) o falla/no contesta → `needs_human=true` → 🔴
- Humano toma el control (manda mensaje manual o pausa el bot) →
  `bot_paused=true`, `needs_human=false` → 🟡
- Humano cierra → `status='closed'` → 🔵
- Devolver el control al bot (reactivar) o reabrir →
  `bot_paused=false`, `needs_human=false` → 🟢

### Disparadores del rojo (definidos con el usuario)

- ✅ Derivación explícita (`derivar_a_humano`)
- ✅ Falla técnica / el bot no llegó a responder un mensaje entrante
- ❌ Fuera de v1: "cliente espera hace X min" (requiere cron) y detección de
  sentimiento ("va mal").

## Cambios

### Backend
- `src/features/ai-agent/agent.ts`: ya incluye la **dirección** del negocio en
  el prompt (fix relacionado) y `derivar_a_humano` ya llama a `deps.escalate`.
- `src/features/whatsapp/runner.ts`: pasar `escalate` a `runAgentTurn`
  (`bot_paused=true`, `needs_human=true`); en error/sin respuesta del agente,
  marcar `needs_human=true`.
- `src/app/api/simulator/route.ts`: igual que el runner.
- `src/features/conversations/actions.ts`:
  - `sendHumanMessageAction` y `toggleBotPausedAction(true)` → `needs_human=false`.
  - `toggleBotPausedAction(false)` → `needs_human=false` (verde).
  - `setConversationStatusAction('open')` → `bot_paused=false`, `needs_human=false`.

### Frontend
- `src/features/conversations/services.ts`: agregar `needs_human` al tipo
  `ConversationListItem` y a los `select` + mapping.
- `src/features/conversations/lib/conversation-color.ts`: helper
  `conversationColor({status, bot_paused, needs_human})` → 'red'|'yellow'|'green'|'blue'
  con sus clases de Tailwind.
- `src/features/conversations/components/conversation-list.tsx`: barra lateral
  (`border-l-4`) + punto de color por fila, y leyenda fija arriba de la lista.

## Alcance / limitaciones

- El color se actualiza al refrescar el dashboard (revalidate/navegación).
  Updates en vivo (realtime) quedan fuera de v1.
