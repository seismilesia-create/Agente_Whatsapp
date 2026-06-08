import Link from 'next/link'
import { requireSuperAdmin } from '@/shared/lib/require-super-admin'
import { logoutAction } from '@/features/auth/actions'
import { Button } from '@/shared/components/ui/button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground font-bold text-background">
              ⚡
            </span>
            <span className="font-bold tracking-tight">Panel de control</span>
          </Link>
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold">god-mode</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{ctx.email}</span>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  )
}
