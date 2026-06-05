import { logoutAction } from '@/features/auth/actions'
import { Button } from '@/shared/components/ui/button'

interface TopbarProps {
  organizationName: string
  email: string | null
}

export function Topbar({ organizationName, email }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <p className="text-sm font-semibold leading-tight">{organizationName}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <form action={logoutAction}>
        <Button variant="outline" size="sm" type="submit">
          Cerrar sesión
        </Button>
      </form>
    </header>
  )
}
