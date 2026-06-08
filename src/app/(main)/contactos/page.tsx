import { getContacts } from '@/features/contacts/services'
import { ContactsManager } from '@/features/contacts/components/contacts-manager'

export default async function ContactosPage() {
  const contacts = await getContacts()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
        <p className="text-sm text-muted-foreground">
          La base de clientes de tu agente. Se cargan solos cuando alguien escribe o saca un turno; acá los
          gestionás para seguimiento y campañas.
        </p>
      </div>
      <ContactsManager contacts={contacts} />
    </div>
  )
}
