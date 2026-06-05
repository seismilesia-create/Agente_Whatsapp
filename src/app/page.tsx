import { redirect } from 'next/navigation'

export default function Home() {
  // El middleware decide: con sesión va al dashboard, sin sesión a /login.
  redirect('/dashboard')
}
