import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     * - _next/static, _next/image, favicon
     * - archivos estáticos comunes
     * - el webhook de WhatsApp (será público, lo verifica Meta por firma)
     * - el cron de confirmaciones (machine-to-machine, lo protege CRON_SECRET)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/whatsapp|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
