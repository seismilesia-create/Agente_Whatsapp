import { getBusinessConfig } from '@/features/config/services'
import { SimulatorChat } from '@/features/simulator/components/simulator-chat'
import { Card } from '@/shared/components/ui/card'

export default async function SimuladorPage() {
  const config = await getBusinessConfig()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Simulador del agente</h1>
        <p className="text-sm text-muted-foreground">
          Hablale como si fueras un cliente por WhatsApp. El agente responde con tu configuración, catálogo y agenda reales — sin necesidad de conectar WhatsApp todavía.
        </p>
      </div>

      {config ? (
        <SimulatorChat agentName={config.agent_name} greeting={config.greeting_message} />
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">
          Configurá tu agente primero (aplicá una plantilla de rubro en Configuración).
        </Card>
      )}
    </div>
  )
}
