import { useEffect, useMemo, useState } from 'react'
import { getAppointments, updateAppointment, Appointment } from '@/services/appointments'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog'
import { useToast } from '@/hooks/use-toast'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const statusBadge = (status: Appointment['status']) => {
  if (status === 'scheduled') return { label: 'Agendado', variant: 'default' as const }
  if (status === 'completed') return { label: 'Concluído', variant: 'secondary' as const }
  return { label: 'Cancelado', variant: 'destructive' as const }
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [month, setMonth] = useState<Date>(new Date())
  const [selected, setSelected] = useState<Appointment | null>(null)
  const { toast } = useToast()

  const load = async () => {
    const data = await getAppointments()
    setAppointments(data)
  }

  useEffect(() => {
    load()
  }, [])
  useRealtime('appointments', load)

  const setStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateAppointment(id, { status })
      await load()
      setSelected(null)
      toast({
        title: status === 'cancelled' ? 'Consulta cancelada' : 'Consulta concluída',
        description:
          status === 'cancelled' ? 'Os lembretes pendentes foram removidos.' : undefined,
      })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agendamentos</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5 bg-muted/30">
            <Button
              variant={view === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5"
              onClick={() => setView('calendar')}
            >
              <CalendarDays className="w-4 h-4" /> Calendário
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4" /> Lista
            </Button>
          </div>
          <NewAppointmentDialog />
        </div>
      </div>

      {view === 'calendar' ? (
        <CalendarView
          appointments={appointments}
          month={month}
          onPrev={() => setMonth(subMonths(month, 1))}
          onNext={() => setMonth(addMonths(month, 1))}
          onToday={() => setMonth(new Date())}
          onSelect={setSelected}
        />
      ) : (
        <ListView appointments={appointments} onSelect={setSelected} />
      )}

      <AppointmentDialog
        appointment={selected}
        onClose={() => setSelected(null)}
        onCancel={(id) => setStatus(id, 'cancelled')}
        onComplete={(id) => setStatus(id, 'completed')}
      />
    </div>
  )
}

function CalendarView({
  appointments,
  month,
  onPrev,
  onNext,
  onToday,
  onSelect,
}: {
  appointments: Appointment[]
  month: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelect: (a: Appointment) => void
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const byDay = (day: Date) =>
    appointments
      .filter((a) => isSameDay(new Date(a.appointment_date), day))
      .sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date))

  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-muted/10">
        <h2 className="text-lg font-semibold capitalize">
          {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToday}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-medium text-muted-foreground py-2">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const dayAppts = byDay(day)
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[92px] border-b border-r p-1.5 flex flex-col gap-1',
                !inMonth && 'bg-muted/20 text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                  isToday(day) && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayAppts.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className={cn(
                      'text-left text-[11px] leading-tight rounded px-1 py-0.5 truncate transition-colors',
                      a.status === 'cancelled'
                        ? 'bg-destructive/10 text-destructive line-through'
                        : a.status === 'completed'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary hover:bg-primary/20',
                    )}
                    title={`${format(new Date(a.appointment_date), 'HH:mm')} ${
                      a.expand?.patient_id?.name || ''
                    }`}
                  >
                    {format(new Date(a.appointment_date), 'HH:mm')}{' '}
                    {a.expand?.patient_id?.name || 'Paciente'}
                  </button>
                ))}
                {dayAppts.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{dayAppts.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListView({
  appointments,
  onSelect,
}: {
  appointments: Appointment[]
  onSelect: (a: Appointment) => void
}) {
  return (
    <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow>
            <TableHead>Data e Hora</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhuma consulta agendada
              </TableCell>
            </TableRow>
          )}
          {appointments.map((a) => {
            const badge = statusBadge(a.status)
            return (
              <TableRow key={a.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    {format(new Date(a.appointment_date), 'dd/MM/yyyy HH:mm')}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-primary">
                  {a.expand?.patient_id?.name || 'Desconhecido'}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate" title={a.notes}>
                  {a.notes || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={badge.variant} className="font-medium">
                    {badge.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onSelect(a)}>
                    Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function AppointmentDialog({
  appointment,
  onClose,
  onCancel,
  onComplete,
}: {
  appointment: Appointment | null
  onClose: () => void
  onCancel: (id: string) => void
  onComplete: (id: string) => void
}) {
  const a = appointment
  const badge = a ? statusBadge(a.status) : null

  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consulta</DialogTitle>
        </DialogHeader>
        {a && (
          <div className="space-y-3 text-sm">
            <Row label="Paciente" value={a.expand?.patient_id?.name || '-'} />
            <Row
              label="Data e hora"
              value={format(new Date(a.appointment_date), 'dd/MM/yyyy HH:mm')}
            />
            <Row label="Observações" value={a.notes || '-'} />
            <div className="flex justify-between gap-4 pb-2">
              <span className="text-muted-foreground">Status</span>
              {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>

            {a.status === 'scheduled' && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="gap-1.5" onClick={() => onComplete(a.id)}>
                  <Check className="w-4 h-4" /> Concluir
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-1.5">
                      <X className="w-4 h-4" /> Cancelar consulta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar esta consulta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A consulta será marcada como cancelada e os lembretes de WhatsApp ainda não
                        enviados serão removidos. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onCancel(a.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sim, cancelar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  )
}
