import { getConversations } from '@/features/conversations/services'
import { ConversationList } from '@/features/conversations/components/conversation-list'

export default async function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const items = await getConversations()

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-border bg-card">
      <aside className="flex w-80 shrink-0 flex-col border-r border-border">
        <div className="shrink-0 border-b border-border p-4">
          <h1 className="text-lg font-bold tracking-tight">Conversaciones</h1>
          <p className="text-xs text-muted-foreground">Chats de tu agente · {items.length}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList items={items} />
        </div>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  )
}
