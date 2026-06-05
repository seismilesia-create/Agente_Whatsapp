import { Card } from '@/shared/components/ui/card'

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conexión de WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Conectá tu número de WhatsApp Business (Meta Cloud API) para activar el agente.
        </p>
      </div>
      <Card className="border-dashed bg-muted/40 p-10 text-center text-sm text-muted-foreground">
        🚧 Próxima fase. Acá vas a cargar las credenciales del número (phone number ID, token,
        verify token) — los tokens se guardan cifrados. Por ahora el conector corre en modo
        simulado para probar el flujo sin Meta.
      </Card>
    </div>
  )
}
