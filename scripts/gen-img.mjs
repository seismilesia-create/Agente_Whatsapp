// Generador de imágenes vía OpenRouter (gemini-2.5-flash-image).
// Uso: node --env-file=.env.local scripts/gen-img.mjs "<prompt>" <output.png> [aspect]
import fs from 'node:fs'
import path from 'node:path'

const [, , prompt, output, aspect = '1:1'] = process.argv
if (!prompt || !output) {
  console.error('Uso: gen-img.mjs "<prompt>" <output.png> [aspect]')
  process.exit(1)
}
const key = process.env.OPENROUTER_API_KEY
if (!key) { console.error('Falta OPENROUTER_API_KEY'); process.exit(1) }

const fullPrompt = `${prompt}\n\nGenerate the image with aspect ratio: ${aspect}. Return ONLY the image.`

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-image',
    messages: [{ role: 'user', content: [{ type: 'text', text: fullPrompt }] }],
  }),
})
if (!res.ok) { console.error('API error', res.status, await res.text()); process.exit(1) }

const data = await res.json()
const msg = data.choices?.[0]?.message
let url = null
if (Array.isArray(msg?.images) && msg.images[0]?.image_url?.url) url = msg.images[0].image_url.url
else if (Array.isArray(msg?.content)) {
  const p = msg.content.find((c) => c.type === 'image_url' && c.image_url?.url)
  if (p) url = p.image_url.url
}
if (!url) { console.error('Sin imagen en la respuesta:', JSON.stringify(data).slice(0, 300)); process.exit(1) }

const b64 = (url.match(/^data:image\/\w+;base64,(.+)/) || [])[1] || url
const buf = Buffer.from(b64, 'base64')
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, buf)
console.log(`OK ${output} (${(buf.length / 1024).toFixed(0)} KB)`)
