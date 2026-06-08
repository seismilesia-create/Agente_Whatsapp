import { notFound } from 'next/navigation'
import { getConversation } from '@/features/conversations/services'
import { ConversationThread } from '@/features/conversations/components/conversation-thread'

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const conversation = await getConversation(id)
  if (!conversation) notFound()
  return <ConversationThread conversation={conversation} />
}
