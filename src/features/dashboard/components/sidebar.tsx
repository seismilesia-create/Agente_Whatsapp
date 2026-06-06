'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◧' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/catalogo', label: 'Productos y Servicios', icon: '📦' },
  { href: '/demo', label: 'Modo demo', icon: '🎬' },
  { href: '/conversations', label: 'Conversaciones', icon: '💬' },
  { href: '/config', label: 'Configuración', icon: '⚙︎' },
  { href: '/whatsapp', label: 'Conexión', icon: '🟢' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai text-ai-foreground font-bold">
          W
        </span>
        <span className="font-bold tracking-tight">Agente WhatsApp</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
