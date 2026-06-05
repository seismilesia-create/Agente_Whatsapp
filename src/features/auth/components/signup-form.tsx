'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction, type AuthState } from '../actions'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { SubmitButton } from './submit-button'

const initial: AuthState = {}

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initial)

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Tu nombre</Label>
        <Input id="fullName" name="fullName" placeholder="Juan Pérez" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationName">Nombre de tu negocio</Label>
        <Input id="organizationName" name="organizationName" placeholder="Clínica Sonrisa" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="vos@negocio.com" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" required />
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      {state.message && (
        <p className="rounded-md bg-ai/10 px-3 py-2 text-sm text-ai">{state.message}</p>
      )}

      <SubmitButton>Crear cuenta</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  )
}
