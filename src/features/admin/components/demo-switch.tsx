'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveDemoAgentAction } from '@/features/whatsapp/switch-actions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

interface Props {
  orgs: { id: string; name: string }[]
  activeId: string | null
  configured: boolean
}

export function DemoSwitch({ orgs, activeId, configured }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const select = (id: string) =>
    start(async () => {
      await setActiveDemoAgentAction(id)
      router.refresh()
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch de demo</CardTitle>
        <CardDescription>
          Qué agente responde en el número de WhatsApp de prueba, para las demos en vivo.
          {!configured && ' ⚠️ El número de prueba todavía no está configurado.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {orgs.map((o) => {
          const active = activeId === o.id
          return (
            <button
              key={o.id}
              type="button"
              disabled={pending}
              onClick={() => select(o.id)}
              className={cn(
                'rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
              )}
            >
              {active ? '🟢 ' : ''}
              {o.name}
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
