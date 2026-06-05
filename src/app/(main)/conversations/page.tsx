import { Card } from '@/shared/components/ui/card'

export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-sm text-muted-foreground">
          Bandeja de chats con historial diferenciado (IA / humano) y toggle de pausa del bot.
        </p>
      </div>
      <Card className="border-dashed bg-muted/40 p-10 text-center text-sm text-muted-foreground">
        🚧 Próxima fase. Acá vas a ver los chats en vivo, con colores por origen
        (<span className="font-semibold text-ai">IA</span>,{' '}
        <span className="font-semibold text-human">humano</span>,{' '}
        <span className="font-semibold text-contact">cliente</span>) y el control para intervenir manualmente.
      </Card>
    </div>
  )
}
