'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ConversationListItem } from '../services'
import { cn } from '@/shared/lib/utils'

const displayName = (c: ConversationListItem) =>
  [c.contact?.name, c.contact?.last_name].filter(Boolean).join(' ') || c.contact?.phone || 'Sin nombre'

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export function ConversationList({ items }: { items: ConversationListItem[] }) {
  const pathname = usePathname()
  if (items.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No hay conversaciones todavía.</p>
  }
  return (
    <div className="divide-y divide-border">
      {items.map((c) => {
        const active = pathname === `/conversations/${c.id}`
        return (
          <Link
            key={c.id}
            href={`/conversations/${c.id}`}
            className={cn('block px-4 py-3 transition-colors hover:bg-muted', active && 'bg-muted')}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{displayName(c)}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{hhmm(c.last_message_at)}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{c.preview ?? '—'}</p>
              {c.bot_paused && (
                <span className="shrink-0 rounded-full bg-human/10 px-1.5 py-0.5 text-[10px] font-semibold text-human">
                  humano
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
