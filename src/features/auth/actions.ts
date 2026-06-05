'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from './schemas'

export interface AuthState {
  error?: string
  message?: string
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { error: 'Email o contraseña incorrectos' }
  }

  redirect('/dashboard')
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get('fullName'),
    organizationName: formData.get('organizationName'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // raw_user_meta_data -> lo lee el trigger handle_new_user() para crear la Organization
      data: {
        full_name: parsed.data.fullName,
        organization_name: parsed.data.organizationName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Si el proyecto NO requiere confirmación de email, ya hay sesión -> al dashboard.
  if (data.session) {
    redirect('/dashboard')
  }

  // Si requiere confirmación, avisamos.
  return {
    message: 'Te enviamos un email para confirmar tu cuenta. Confirmá y luego iniciá sesión.',
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
