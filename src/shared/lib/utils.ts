/**
 * cn — une clases condicionales de forma segura.
 * Implementacion liviana sin dependencias externas (clsx/tailwind-merge).
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []

  const walk = (value: ClassValue): void => {
    if (!value) return
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value))
    } else if (Array.isArray(value)) {
      value.forEach(walk)
    } else if (typeof value === 'object') {
      for (const [key, enabled] of Object.entries(value)) {
        if (enabled) out.push(key)
      }
    }
  }

  inputs.forEach(walk)
  return out.join(' ')
}
