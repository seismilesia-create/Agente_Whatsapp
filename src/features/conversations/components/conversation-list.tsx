'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ConversationListItem } from '../services'
import { conversationColor, COLOR_META, LEGEND_ORDER } from '../lib/conversation-color'
import { cn } from '@/shared/lib/utils'

const displayName = (c: ConversationListItem) =>
  [c.contact?.name, c.contact?.last_name].filter(Boolean).join(' ') || c.contact?.phone || 'Sin nombre'

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

/** Leyenda fija de colores para el personal del dashboard. */
function ColorLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
      {LEGEND_ORDER.map((key) => {
        const meta = COLOR_META[key]
        return (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
            {meta.label}
          </span>
        )
      })}
    </div>
  )
}

export function ConversationList({ items }: { items: ConversationListItem[] }) {
  const pathname = usePathname()

  return (
    <div>
      <ColorLegend />
      {items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No hay conversaciones todavía.</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((c) => {
            const active = pathname === `/conversations/${c.id}`
            const meta = COLOR_META[conversationColor(c)]
            return (
              <Link
                key={c.id}
                href={`/conversations/${c.id}`}
                className={cn(
                  'block border-l-4 px-4 py-3 transition-colors hover:bg-muted',
                  meta.barClass,
                  active && 'bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dotClass)} />
                    <span className="truncate text-sm font-medium">{displayName(c)}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{hhmm(c.last_message_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{c.preview ?? '—'}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
