import { getCatalogItems } from '@/features/catalog/services'
import { getSessionContext } from '@/shared/lib/get-session'
import { CatalogManager } from '@/features/catalog/components/catalog-manager'

export default async function CatalogoPage() {
  const [items, ctx] = await Promise.all([getCatalogItems(), getSessionContext()])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Productos y Servicios</h1>
        <p className="text-sm text-muted-foreground">
          Cargá tu catálogo con características, disponibilidad y fotos/videos. El agente lo usa para responder y enviar material a los clientes.
        </p>
      </div>

      {ctx && <CatalogManager items={items} organizationId={ctx.organization.id} />}
    </div>
  )
}
