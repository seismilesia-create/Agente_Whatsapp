'use client'

import { useActionState, useState } from 'react'
import { updateBusinessConfigAction, type ConfigState } from '../actions'
import type { BusinessConfig, BusinessHour, Faq, ScheduleException } from '@/shared/types/database'
import type { ArHoliday } from '../ar-holidays'
import { ScheduleEditor } from './schedule-editor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { SubmitButton } from '@/features/auth/components/submit-button'

const initial: ConfigState = {}

interface ConfigFormProps {
  config: BusinessConfig
  hours: BusinessHour[]
  exceptions: ScheduleException[]
  holidays: ArHoliday[]
  confirmationEnabled: boolean
}

export function ConfigForm({ config, hours, exceptions, holidays, confirmationEnabled }: ConfigFormProps) {
  const [state, formAction] = useActionState(updateBusinessConfigAction, initial)
  const [faqs, setFaqs] = useState<Faq[]>(config.faqs ?? [])

  const addFaq = () => setFaqs((f) => [...f, { q: '', a: '' }])
  const removeFaq = (i: number) => setFaqs((f) => f.filter((_, idx) => idx !== i))
  const updateFaq = (i: number, key: keyof Faq, value: string) =>
    setFaqs((f) => f.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)))

  return (
    <form action={formAction} className="space-y-6">
      {/* FAQs serializadas para el server action */}
      <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />

      {/* Identidad del agente */}
      <Card>
        <CardHeader>
          <CardTitle>Identidad del agente</CardTitle>
          <CardDescription>Cómo se presenta y comporta tu agente de IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agent_name">Nombre del agente</Label>
              <Input id="agent_name" name="agent_name" defaultValue={config.agent_name} placeholder="Sofía" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tono de voz</Label>
              <Input id="tone" name="tone" defaultValue={config.tone} placeholder="profesional y cordial" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="system_prompt">Instrucciones (System Prompt)</Label>
            <Textarea
              id="system_prompt"
              name="system_prompt"
              defaultValue={config.system_prompt}
              className="min-h-[140px]"
              placeholder="Sos el asistente de ventas de [negocio]. Tu rol es responder dudas de productos y precios, calificar al cliente y cerrar la venta. Reglas: nunca inventes precios, sé claro y breve…"
            />
            <p className="text-xs text-muted-foreground">Define el rol, las reglas de comportamiento y los límites del agente.</p>
          </div>
        </CardContent>
      </Card>

      {/* Datos del negocio */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
          <CardDescription>Información que el agente usa para responder.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Nombre del negocio</Label>
              <Input id="business_name" name="business_name" defaultValue={config.business_name ?? ''} placeholder="Clínica Sonrisa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" defaultValue={config.address ?? ''} placeholder="Av. Siempre Viva 123" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horarios, fechas especiales y feriados */}
      <ScheduleEditor hours={hours} exceptions={exceptions} holidays={holidays} timeFormat={config.time_format} />

      {/* Confirmación de turno (feature premium, habilitada por el super-admin) */}
      {confirmationEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmación de turno</CardTitle>
            <CardDescription>
              Recordatorio automático por WhatsApp para que el cliente confirme su turno. ✨ Plan premium.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation_hours_before">Enviar cuántas horas antes</Label>
              <Input
                id="confirmation_hours_before"
                name="confirmation_hours_before"
                type="number"
                min={1}
                max={168}
                defaultValue={config.confirmation_hours_before ?? 24}
                className="max-w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation_message">Mensaje</Label>
              <Textarea
                id="confirmation_message"
                name="confirmation_message"
                defaultValue={config.confirmation_message ?? ''}
                className="min-h-[100px]"
                placeholder="¡Hola {nombre}! Te recordamos tu turno de {servicio} el {fecha} a las {hora}…"
              />
              <p className="text-xs text-muted-foreground">
                Dejalo vacío para usar el texto por defecto. Variables: {'{nombre}'} {'{servicio}'} {'{fecha}'}{' '}
                {'{hora}'} {'{negocio}'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas frecuentes</CardTitle>
          <CardDescription>El agente prioriza estas respuestas ante consultas comunes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no agregaste FAQs.</p>
          )}
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <Label>FAQ #{i + 1}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFaq(i)}>
                  Quitar
                </Button>
              </div>
              <Input
                placeholder="Pregunta (ej. ¿Cuáles son los horarios?)"
                value={faq.q}
                onChange={(e) => updateFaq(i, 'q', e.target.value)}
              />
              <Textarea
                placeholder="Respuesta"
                value={faq.a}
                onChange={(e) => updateFaq(i, 'a', e.target.value)}
                className="min-h-[72px]"
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addFaq}>
            + Agregar FAQ
          </Button>
        </CardContent>
      </Card>

      {/* Mensajería de flujo */}
      <Card>
        <CardHeader>
          <CardTitle>Mensajería de flujo</CardTitle>
          <CardDescription>Mensajes clave de la conversación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="greeting_message">Saludo inicial</Label>
            <Textarea id="greeting_message" name="greeting_message" defaultValue={config.greeting_message} className="min-h-[72px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handoff_message">Mensaje de transferencia a humano</Label>
            <Textarea id="handoff_message" name="handoff_message" defaultValue={config.handoff_message} className="min-h-[72px]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <div className="w-48">
          <SubmitButton>Guardar configuración</SubmitButton>
        </div>
        {state.success && <p className="text-sm font-medium text-ai">✓ Configuración guardada</p>}
        {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      </div>
    </form>
  )
}
