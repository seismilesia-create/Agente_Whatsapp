import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAppointmentConfirmations } from '@/features/appointments/confirmations'

/**
 * Cron de "Confirmación de turno". Lo dispara Vercel Cron (ver vercel.json) cada hora.
 * Protegido por CRON_SECRET (Vercel manda `Authorization: Bearer <CRON_SECRET>`).
 */
export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const db = createAdminClient()
    const result = await runAppointmentConfirmations(db)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('Cron confirmations error:', e)
    return NextResponse.json({ ok: false, error: 'Error procesando confirmaciones' }, { status: 500 })
  }
}
