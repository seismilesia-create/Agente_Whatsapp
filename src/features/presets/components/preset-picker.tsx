'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PRESETS } from '../presets'
import { applyPresetAction } from '../actions'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'

export function PresetPicker({ currentVertical }: { currentVertical?: string }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const apply = (key: string) => {
    setError(null)
    setSelected(key)
    startTransition(async () => {
      const res = await applyPresetAction(key)
      if (res.error) {
        setError(res.error)
        setSelected(null)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {PRESETS.map((preset) => (
          <Card key={preset.key} className="flex flex-col p-5">
            <div className="text-3xl">{preset.emoji}</div>
            <h3 className="mt-3 font-semibold">{preset.label}</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{preset.description}</p>
            <div className="mt-3 text-xs text-muted-foreground">
              {preset.services.length} servicios · agente «{preset.agent_name}»
            </div>
            <Button
              className="mt-4"
              size="sm"
              variant={currentVertical === preset.vertical ? 'primary' : 'outline'}
              disabled={pending}
              onClick={() => apply(preset.key)}
            >
              {pending && selected === preset.key ? 'Aplicando…' : 'Aplicar plantilla'}
            </Button>
          </Card>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
