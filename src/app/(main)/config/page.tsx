import Link from 'next/link'
import { getBusinessConfig } from '@/features/config/services'
import { getBusinessHours, getScheduleExceptions } from '@/features/appointments/services'
import { upcomingHolidays } from '@/features/config/ar-holidays'
import { arDateString } from '@/features/appointments/slots'
import { getSessionContext } from '@/shared/lib/get-session'
import { ConfigForm } from '@/features/config/components/config-form'
import { PresetPicker } from '@/features/presets/components/preset-picker'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'

export default async function ConfigPage() {
  const [config, ctx, hours, exceptions] = await Promise.all([
    getBusinessConfig(),
    getSessionContext(),
    getBusinessHours(),
    getScheduleExceptions(),
  ])
  const holidays = upcomingHolidays(arDateString(Date.now(), 0), 12)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración del agente</h1>
        <p className="text-sm text-muted-foreground">
          Personalizá cómo atiende tu agente de WhatsApp. Estos parámetros alimentan el motor de IA.
        </p>
      </div>

      {/* Plantillas por rubro */}
      <Card>
        <CardHeader>
          <CardTitle>Plantilla de rubro</CardTitle>
          <CardDescription>
            Aplicá una plantilla y el agente queda configurado para ese rubro (prompt, FAQs, servicios y horarios). Después podés ajustar todo abajo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PresetPicker currentVertical={ctx?.organization.vertical} />
        </CardContent>
      </Card>

      {/* Catálogo */}
      <Card>
        <CardHeader>
          <CardTitle>Productos y Servicios</CardTitle>
          <CardDescription>
            Cargá tu catálogo con características, disponibilidad y fotos/videos para que el agente los use al atender.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/catalogo">
            <Button variant="outline">📦 Gestionar productos y servicios</Button>
          </Link>
        </CardContent>
      </Card>

      {config ? (
        <ConfigForm
          config={config}
          hours={hours}
          exceptions={exceptions}
          holidays={holidays}
          confirmationEnabled={Boolean(ctx?.organization.features?.appointment_confirmation)}
        />
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">
          No se encontró la configuración. Si recién creaste la cuenta, recargá la página.
        </Card>
      )}
    </div>
  )
}
