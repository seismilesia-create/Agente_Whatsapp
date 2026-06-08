import crypto from 'node:crypto'

/**
 * Integración mínima con Google Calendar vía Service Account (JWT → access token).
 * Sin SDK: firma un JWT RS256 con la private key del service account y llama la REST API.
 * Para la demo, las 3 organizaciones escriben en UN calendario compartido (GOOGLE_CALENDAR_ID).
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars'
const SCOPE = 'https://www.googleapis.com/auth/calendar'
export const AR_TZ = 'America/Argentina/Buenos_Aires'

export function isCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SA_CLIENT_EMAIL &&
      process.env.GOOGLE_SA_PRIVATE_KEY &&
      process.env.GOOGLE_CALENDAR_ID,
  )
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

let cachedToken: { token: string; exp: number } | null = null

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SA_CLIENT_EMAIL
  const key = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) return null

  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token

  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = { iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key)
  const jwt = `${unsigned}.${b64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google token error: ${JSON.stringify(data).slice(0, 200)}`)
  cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) }
  return cachedToken.token
}

export async function createCalendarEvent(params: {
  summary: string
  description?: string
  startISO: string
  endISO: string
}): Promise<string | null> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  const token = await getAccessToken()
  if (!token || !calendarId) return null

  const res = await fetch(`${CAL_BASE}/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: params.summary,
      description: params.description ?? '',
      start: { dateTime: params.startISO, timeZone: AR_TZ },
      end: { dateTime: params.endISO, timeZone: AR_TZ },
    }),
  })
  if (!res.ok) {
    console.error('GCal create event failed:', await res.text())
    return null
  }
  const data = await res.json()
  return (data.id as string) ?? null
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  const token = await getAccessToken()
  if (!token || !calendarId || !eventId) return
  await fetch(`${CAL_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
