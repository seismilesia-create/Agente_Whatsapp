import { getSessionContext } from '@/shared/lib/get-session'
import { getDashboardMetrics } from '@/features/dashboard/services/metrics'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'

const VERTICAL_LABEL: Record<string, string> = {
  ventas: 'Asistente de ventas',
  turnos: 'Gestión de turnos',
  institucional: 'Atención institucional',
}

export default async function DashboardPage() {
  const ctx = await getSessionContext()
  const m = await getDashboardMetrics()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {ctx?.profile.full_name || 'bienvenido'} 👋</h1>
          <p className="text-sm text-muted-foreground">Resumen de actividad de tu agente.</p>
        </div>
        <Badge variant="ai">{VERTICAL_LABEL[ctx?.organization.vertical ?? 'ventas']}</Badge>
      </div>

      {/* Bento-Grid de KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* KPI principal 2x2 — Conversaciones */}
        <Card className="col-span-2 row-span-2 flex flex-col justify-between bg-gradient-to-br from-primary to-human p-6 text-primary-foreground">
          <div>
            <p className="text-sm font-medium opacity-80">Conversaciones (30 días)</p>
            <p className="mt-2 text-5xl font-bold">{m.conversations30d}</p>
          </div>
          <p className="mt-4 text-sm opacity-80">{m.totalConversations} en total · {m.totalContacts} contactos</p>
        </Card>

        {/* Bot en Pausa — métrica de ROI */}
        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Bot en pausa</p>
          <p className="mt-1 text-3xl font-bold text-human">{m.botPausedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">requirieron humano</p>
        </Card>

        {/* Resolución IA */}
        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Resueltas por IA</p>
          <p className="mt-1 text-3xl font-bold text-ai">{m.aiResolutionRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">de los mensajes salientes</p>
        </Card>

        {/* Mensajes IA */}
        <Card className="flex flex-col justify-center p-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-ai" />
            <p className="text-xs font-medium text-muted-foreground">Mensajes IA</p>
          </div>
          <p className="mt-1 text-2xl font-bold">{m.aiMessages}</p>
        </Card>

        {/* Mensajes Humano */}
        <Card className="flex flex-col justify-center p-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-human" />
            <p className="text-xs font-medium text-muted-foreground">Mensajes humano</p>
          </div>
          <p className="mt-1 text-2xl font-bold">{m.humanMessages}</p>
        </Card>

        {/* Contactos nuevos — ancho 2x1 */}
        <Card className="col-span-2 flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Contactos nuevos</p>
            <p className="mt-1 text-2xl font-bold">{m.newContacts}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">Recurrentes</p>
            <p className="mt-1 text-2xl font-bold">{m.totalContacts - m.newContacts}</p>
          </div>
        </Card>
      </div>

      {m.totalConversations === 0 && (
        <Card className="border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Todavía no hay conversaciones. Configurá tu agente en{' '}
          <a href="/config" className="font-semibold text-primary hover:underline">Configuración</a>{' '}
          y conectá WhatsApp para empezar a recibir mensajes.
        </Card>
      )}
    </div>
  )
}
