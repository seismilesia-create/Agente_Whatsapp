import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminClient } from '@/features/admin/services'
import { requireSuperAdmin } from '@/shared/lib/require-super-admin'
import { ClientControls } from '@/features/admin/components/client-controls'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

const rubro = (v: string) => (v === 'turnos' ? 'Turnos' : v === 'ventas' ? 'Ventas' : 'Institucional')

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params
  const data = await getAdminClient(id)
  if (!data) notFound()
  const { stats: c, config } = data

  const cards = [
    { label: 'Servicios', value: c.services },
    { label: 'Contactos', value: c.contacts },
    { label: 'Conversaciones', value: c.conversations },
    { label: 'Turnos', value: c.appointments },
    { label: 'Mensajes IA', value: c.aiMessages },
    { label: 'Mensajes humano', value: c.humanMessages },
  ]

  return (
    <div className="space-y-6">
      <Link href="/admin">
        <Button variant="ghost" size="sm">
          ← Volver al panel
        </Button>
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{c.org.name}</h1>
          <Badge variant="muted">{rubro(c.org.vertical)}</Badge>
          <Badge variant="muted">plan {c.org.plan}</Badge>
          {c.isActiveDemo && <Badge variant="ai">activo en demo</Badge>}
          {!c.org.agent_enabled && <Badge variant="muted">desconectado</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{c.ownerEmail}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controles</CardTitle>
          <CardDescription>Interruptor del agente y add-ons habilitados para este cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientControls orgId={c.org.id} agentEnabled={c.org.agent_enabled} features={c.org.features} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del agente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {config ? (
            <>
              <p>
                <span className="text-muted-foreground">Agente:</span> {config.agent_name}
              </p>
              <p>
                <span className="text-muted-foreground">Tono:</span> {config.tone}
              </p>
              <p>
                <span className="text-muted-foreground">FAQs cargadas:</span> {config.faqs?.length ?? 0}
              </p>
              <p>
                <span className="text-muted-foreground">Negocio:</span> {config.business_name || '—'}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Sin configuración cargada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
