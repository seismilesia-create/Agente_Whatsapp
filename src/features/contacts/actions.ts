'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionContext } from '@/shared/lib/get-session'
import { contactSchema } from './schemas'

export interface ContactState {
  error?: string
  success?: string
  contactId?: string
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(String(raw))
    return Array.isArray(arr) ? arr.map((t) => String(t).trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

/** Crea o actualiza un contacto. Si viene `contactId`, actualiza. */
export async function upsertContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Sesión expirada' }

  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    last_name: formData.get('last_name') ?? '',
    phone: formData.get('phone'),
    email: formData.get('email') ?? '',
    birthday: formData.get('birthday') ?? '',
    notes: formData.get('notes') ?? '',
    tags: parseTags(formData.get('tags')),
    marketing_opt_in: formData.get('marketing_opt_in') === 'true',
    status: formData.get('status') ?? 'new',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const contactId = String(formData.get('contactId') ?? '')
  const d = parsed.data
  const payload = {
    organization_id: ctx.organization.id,
    name: d.name,
    last_name: d.last_name || null,
    phone: d.phone,
    email: d.email || null,
    birthday: d.birthday || null,
    notes: d.notes || null,
    tags: d.tags,
    marketing_opt_in: d.marketing_opt_in,
    status: d.status,
  }

  let resultId = contactId
  if (contactId) {
    const { error } = await supabase.from('contacts').update(payload).eq('id', contactId)
    if (error) return { error: 'No se pudo guardar el contacto' }
  } else {
    const { data, error } = await supabase.from('contacts').insert(payload).select('id').single<{ id: string }>()
    if (error || !data) {
      return { error: 'No se pudo crear (¿ya hay un contacto con ese celular?)' }
    }
    resultId = data.id
  }

  revalidatePath('/contactos')
  return { success: 'Contacto guardado ✓', contactId: resultId }
}

export async function deleteContactAction(contactId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('contacts').delete().eq('id', contactId)
  revalidatePath('/contactos')
}
