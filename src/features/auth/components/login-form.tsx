'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, type AuthState } from '../actions'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { SubmitButton } from './submit-button'

const initial: AuthState = {}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initial)

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="vos@negocio.com" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <SubmitButton>Iniciar sesión</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  )
}
