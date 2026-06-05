import { getServices, getBusinessHours, getUpcomingAppointments } from '@/features/appointments/services'
import { AppointmentList } from '@/features/appointments/components/appointment-list'
import { NuevoTurno } from '@/features/appointments/components/nuevo-turno'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const hhmm = (t: string) => t.slice(0, 5)
const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function AgendaPage() {
  const [services, hours, appointments] = await Promise.all([
    getServices(),
    getBusinessHours(),
    getUpcomingAppointments(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">Turnos, servicios y horarios de tu negocio.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Turnos próximos */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Próximos turnos</h2>
          <AppointmentList appointments={appointments} />
        </div>

        {/* Panel lateral: nuevo turno + servicios + horarios */}
        <div className="space-y-6">
          <NuevoTurno services={services} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Servicios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {services.length === 0 && <p className="text-sm text-muted-foreground">Sin servicios cargados.</p>}
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">{s.duration_min}m · {money(s.price)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {hours.length === 0 && <p className="text-sm text-muted-foreground">Sin horarios cargados.</p>}
              {hours.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{WEEKDAYS[h.weekday]}</span>
                  <span>{hhmm(h.open_time)}–{hhmm(h.close_time)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
