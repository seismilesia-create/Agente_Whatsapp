/**
 * URL pública base de la app. En Vercel usa el dominio del deployment;
 * en local, NEXT_PUBLIC_SITE_URL. Sirve para construir URLs absolutas
 * (ej. fotos del catálogo que se mandan por WhatsApp, que requieren URL completa).
 */
export function publicBaseUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL
  if (site && !site.includes('localhost')) return site.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return (site ?? 'http://localhost:3000').replace(/\/$/, '')
}

/** Convierte una URL relativa (/demo-media/x.png) en absoluta. */
export function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url
  return `${publicBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`
}
