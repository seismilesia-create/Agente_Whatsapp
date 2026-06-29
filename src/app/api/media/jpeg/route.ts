import sharp from 'sharp'

/**
 * Convierte una imagen (típicamente .webp del catálogo) a JPEG al vuelo.
 * WhatsApp solo acepta JPEG/PNG en mensajes de imagen, no webp.
 *
 * Seguridad: solo se permite convertir imágenes del bucket público de Supabase
 * de este proyecto (evita usar la ruta como proxy abierto / SSRF).
 */
function allowedSource(src: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return false
  return src.startsWith(`${base}/storage/v1/object/public/`)
}

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get('src')
  if (!src || !allowedSource(src)) {
    return new Response('Bad Request', { status: 400 })
  }

  try {
    const upstream = await fetch(src)
    if (!upstream.ok) return new Response('Not Found', { status: 404 })
    const input = Buffer.from(await upstream.arrayBuffer())
    const jpeg = await sharp(input).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer()

    return new Response(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return new Response('Conversion error', { status: 502 })
  }
}
