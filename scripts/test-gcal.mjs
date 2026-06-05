// Prueba directa de la integración con Google Calendar (service account).
// Uso: node --env-file=.env.local scripts/test-gcal.mjs
import crypto from 'node:crypto'

const email = process.env.GOOGLE_SA_CLIENT_EMAIL
const key = (process.env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const calendarId = process.env.GOOGLE_CALENDAR_ID

if (!email || !key || !calendarId) {
  console.error('❌ Faltan variables', { email: !!email, key: !!key, calendarId: !!calendarId })
  process.exit(1)
}

const b64url = (i) =>
  Buffer.from(i).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

const now = Math.floor(Date.now() / 1000)
const header = { alg: 'RS256', typ: 'JWT' }
const claim = {
  iss: email,
  scope: 'https://www.googleapis.com/auth/calendar',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
}
const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(key)
const jwt = `${unsigned}.${b64url(sig)}`

const tok = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }),
}).then((r) => r.json())

if (!tok.access_token) {
  console.error('❌ Error obteniendo token:', tok)
  process.exit(1)
}
console.log('✅ Autenticación OK (token obtenido)')

const tomorrow = new Date(Date.now() + 86400000)
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba' }).format(tomorrow)

const ev = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: '✅ PRUEBA — Agente WhatsApp',
      description: 'Evento de prueba de la integración. Lo podés borrar.',
      start: { dateTime: `${day}T10:00:00-03:00`, timeZone: 'America/Argentina/Cordoba' },
      end: { dateTime: `${day}T10:30:00-03:00`, timeZone: 'America/Argentina/Cordoba' },
    }),
  },
).then((r) => r.json())

if (ev.id) {
  console.log('✅ Evento de prueba creado en tu calendario:', ev.id)
  console.log('   Fecha: mañana 10:00–10:30 (Argentina)')
  if (ev.htmlLink) console.log('   Link:', ev.htmlLink)
} else {
  console.error('❌ Error creando evento:', ev)
  process.exit(1)
}
