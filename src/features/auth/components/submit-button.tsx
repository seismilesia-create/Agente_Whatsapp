'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/shared/components/ui/button'

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Procesando…' : children}
    </Button>
  )
}
