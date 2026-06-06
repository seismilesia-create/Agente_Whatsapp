// Sube las variables de entorno necesarias a Vercel (producción).
// Uso: node --env-file=.env.local scripts/push-vercel-env.mjs
import { execSync } from 'node:child_process'

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'LLM_PROVIDER',
  'GOOGLE_SA_CLIENT_EMAIL',
  'GOOGLE_SA_PRIVATE_KEY',
  'GOOGLE_CALENDAR_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_TEST_PHONE_NUMBER_ID',
  'WHATSAPP_TEST_ACCESS_TOKEN',
]

for (const key of KEYS) {
  const value = process.env[key]
  if (!value) {
    console.log(`⏭️  ${key}: sin valor, salteado`)
    continue
  }
  try {
    // remover si ya existe (idempotente) y volver a agregar
    try {
      execSync(`vercel env rm ${key} production --yes`, { stdio: 'ignore' })
    } catch {
      /* no existía */
    }
    execSync(`vercel env add ${key} production`, { input: value, stdio: ['pipe', 'ignore', 'ignore'] })
    console.log(`✅ ${key}`)
  } catch (e) {
    console.log(`❌ ${key}: ${e.message?.slice(0, 80)}`)
  }
}
console.log('Listo.')
