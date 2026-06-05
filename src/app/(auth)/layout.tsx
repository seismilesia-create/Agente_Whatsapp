import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ai text-ai-foreground font-bold">
          W
        </span>
        <span className="text-lg font-bold tracking-tight">Agente WhatsApp</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
