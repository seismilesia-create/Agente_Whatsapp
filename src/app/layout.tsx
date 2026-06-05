import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agente WhatsApp · Atención & Ventas IA',
  description: 'Plataforma de agentes conversacionales de WhatsApp con IA + dashboard de supervisión.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
