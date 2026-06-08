import Link from 'next/link'
import { getAdminClients, summarize } from '@/features/admin/services'
import { getDemoSwitch } from '@/features/whatsapp/switch-data'
import { requireSuperAdmin } from '@/shared/lib/require-super-admin'
import { DemoSwitch } from '@/features/admin/components/demo-switch'
import { ClientControls } from '@/features/admin/components/client-controls'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

const rubro = (v: string) => (v === 'turnos' ? 'Turnos' : v === 'ventas' ? 'Ventas' : 'Institucional')
const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(
        new Date(iso),
      )
    : '—'

export default async function AdminPage() {
  await requireSuperAdmin()
  const [clients, demo] = await Promise.all([getAdminClients(), getDemoSwitch()])
  const o = summarize(clients)

  const cards = [
    { label: 'Clientes', value: o.clients },
    { label: 'Agentes activos', value: o.activeAgents },
    { label: 'Conversaciones', value: o.conversations },
    { label: 'Mensajes IA', value: o.aiMessages },
    { label: 'Mensajes humano', value: o.humanMessages },
    { label: 'Turnos', value: o.appointments },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel general</h1>
        <p className="text-sm text-muted-foreground">Vista global de todos los agentes que están corriendo.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      <DemoSwitch
        orgs={clients.map((c) => ({ id: c.org.id, name: c.org.name }))}
        activeId={demo.activeId}
        configured={demo.configured}
      />

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Cada negocio con sus métricas y los interruptores del agente y sus features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 && <p className="text-sm text-muted-foreground">No hay clientes cargados.</p>}
          {clients.map((c) => (
            <div key={c.org.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.org.name}</span>
                    <Badge variant="muted">{rubro(c.org.vertical)}</Badge>
                    <Badge variant="muted">{c.org.plan}</Badge>
                    {c.isActiveDemo && <Badge variant="ai">activo en demo</Badge>}
                    {!c.org.agent_enabled && <Badge variant="muted">desconectado</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.ownerEmail} · {c.services} serv. · {c.conversations} charlas · {c.appointments} turnos ·{' '}
                    {c.contacts} contactos · últ. {fmtDate(c.lastActivity)}
                  </p>
                </div>
                <Link href={`/admin/clientes/${c.org.id}`}>
                  <Button variant="outline" size="sm">
                    Ver detalle
                  </Button>
                </Link>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <ClientControls orgId={c.org.id} agentEnabled={c.org.agent_enabled} features={c.org.features} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
