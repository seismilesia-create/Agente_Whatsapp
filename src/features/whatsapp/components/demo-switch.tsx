'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DemoSwitchData } from '../switch-data'
import { setActiveDemoAgentAction } from '../switch-actions'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'

const VERTICAL_EMOJI: Record<string, string> = { turnos: '📅', ventas: '🛒', institucional: '🏛️' }

export function DemoSwitch({ data }: { data: DemoSwitchData }) {
  const [pending, startTransition] = useTransition()
  const [selecting, setSelecting] = useState<string | null>(null)
  const router = useRouter()

  const select = (orgId: string) => {
    setSelecting(orgId)
    startTransition(async () => {
      await setActiveDemoAgentAction(orgId)
      router.refresh()
      setSelecting(null)
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.orgs.map((org) => {
          const active = org.id === data.activeId
          return (
            <Card
              key={org.id}
              className={
                'cursor-pointer p-4 transition-all ' +
                (active ? 'ring-2 ring-ai border-ai' : 'hover:border-primary/40')
              }
              onClick={() => !active && select(org.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{VERTICAL_EMOJI[org.vertical] ?? '🤖'}</span>
                {active ? (
                  <Badge variant="ai">● Activo</Badge>
                ) : pending && selecting === org.id ? (
                  <Badge variant="muted">activando…</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">activar</span>
                )}
              </div>
              <p className="mt-2 font-semibold">{org.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{org.vertical}</p>
            </Card>
          )
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        El agente marcado como <span className="font-semibold text-ai">● Activo</span> es el que responde
        en el número de prueba de WhatsApp. Cambialo antes de cada demostración.
      </p>
    </div>
  )
}
