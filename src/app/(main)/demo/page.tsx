import { getDemoSwitch } from '@/features/whatsapp/switch-data'
import { DemoSwitch } from '@/features/whatsapp/components/demo-switch'
import { Card } from '@/shared/components/ui/card'

export default async function DemoPage() {
  const data = await getDemoSwitch()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modo demo · WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Elegí qué agente responde en el número de prueba. Un solo número, el rubro que quieras en cada presentación.
        </p>
      </div>

      {!data.configured && (
        <Card className="border-dashed bg-muted/40 p-5 text-sm text-muted-foreground">
          ⚠️ Todavía falta cargar las credenciales del número de prueba de Meta
          (<code>WHATSAPP_TEST_PHONE_NUMBER_ID</code> y token). El switch ya funciona; cuando estén las credenciales, el número responderá en vivo.
        </Card>
      )}

      <DemoSwitch data={data} />
    </div>
  )
}
