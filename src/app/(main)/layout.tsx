import { redirect } from 'next/navigation'
import { getSessionContext } from '@/shared/lib/get-session'
import { Sidebar } from '@/features/dashboard/components/sidebar'
import { Topbar } from '@/features/dashboard/components/topbar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/login')

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar organizationName={ctx.organization.name} email={ctx.email} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
