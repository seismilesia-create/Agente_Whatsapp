'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAgentEnabledAction, toggleFeatureAction } from '../actions'
import { FEATURES } from '../features'
import { cn } from '@/shared/lib/utils'

function Toggle({
  label,
  hint,
  on,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  on: boolean
  disabled: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          on ? 'bg-ai' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
            on ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}

export function ClientControls({
  orgId,
  agentEnabled,
  features,
}: {
  orgId: string
  agentEnabled: boolean
  features: Record<string, boolean>
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const setAgent = (v: boolean) =>
    start(async () => {
      await toggleAgentEnabledAction(orgId, v)
      router.refresh()
    })
  const setFeat = (k: string, v: boolean) =>
    start(async () => {
      await toggleFeatureAction(orgId, k, v)
      router.refresh()
    })

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Toggle
        label="Agente activo"
        hint={agentEnabled ? 'Responde por WhatsApp' : 'Desconectado'}
        on={agentEnabled}
        disabled={pending}
        onChange={() => setAgent(!agentEnabled)}
      />
      {FEATURES.map((f) => (
        <Toggle
          key={f.key}
          label={f.label}
          hint={f.comingSoon ? 'add-on · próximamente' : f.description}
          on={!!features[f.key]}
          disabled={pending}
          onChange={() => setFeat(f.key, !features[f.key])}
        />
      ))}
    </div>
  )
}
