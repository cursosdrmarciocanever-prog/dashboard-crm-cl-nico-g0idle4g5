import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getAppointments,
  updateAppointment,
  deleteAppointment,
  Appointment,
} from '@/services/appointments'
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
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** Formato aceito pelo PocketBase — o mesmo usado ao criar a consulta. */
const paraPocketBase = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

/** Mesmo dia do alvo, mesmo horário da consulta original. */
const trocarDia = (original: Date, novoDia: Date) => {
  const d = new Date(novoDia)
  d.setHours(original.getHours(), original.getMinutes(), 0, 0)
  return d
}

const statusBadge = (status: Appointment['status']) => {
  if (status === 'scheduled') return { label: 'Agendado', variant: 'default' as const }
  if (status === 'completed') return { label: 'Concluído', variant: 'secondary' as const }
  return { label: 'Cancelado', variant: 'destructive' as const }
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [view, setView] = useState<'calendar' | 'list'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'calendar',
  )
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

  const excluir = async (id: string) => {
    try {
      await deleteAppointment(id)
      await load()
      setSelected(null)
      toast({
        title: 'Consulta excluída',
        description: 'O registro saiu da agenda e os lembretes pendentes foram removidos.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a consulta.',
        variant: 'destructive',
      })
    }
  }

  /**
   * Remaneja a consulta para outro dia mantendo o horário. Só mexe na data —
   * status, paciente e observações ficam intactos, e o hook de lembretes
   * reagenda sozinho ao ver a data mudar.
   */
  const moverPara = async (appt: Appointment, novoDia: Date) => {
    const original = new Date(appt.appointment_date)
    if (isSameDay(original, novoDia)) return

    const destino = trocarDia(original, novoDia)
    const anterior = appt.appointment_date

    try {
      await updateAppointment(appt.id, { appointment_date: paraPocketBase(destino) })
      await load()
      const nome = appt.expand?.patient_id?.name || 'Consulta'
      toast({
        title: 'Consulta remanejada',
        description: `${nome} — ${format(destino, "dd/MM 'às' HH:mm")}. Os lembretes foram reagendados.`,
        action: (
          <ToastAction
            altText="Desfazer"
            onClick={async () => {
              try {
                await updateAppointment(appt.id, { appointment_date: anterior })
                await load()
              } catch {
                toast({ title: 'Erro', description: 'Não foi possível desfazer.', variant: 'destructive' })
              }
            }}
          >
            Desfazer
          </ToastAction>
        ),
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível remanejar a consulta.',
        variant: 'destructive',
      })
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
          onMove={moverPara}
        />
      ) : (
        <ListView appointments={appointments} onSelect={setSelected} />
      )}

      <AppointmentDialog
        appointment={selected}
        onClose={() => setSelected(null)}
        onCancel={(id) => setStatus(id, 'cancelled')}
        onComplete={(id) => setStatus(id, 'completed')}
        onDelete={excluir}
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
  onMove,
}: {
  appointments: Appointment[]
  month: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelect: (a: Appointment) => void
  onMove: (a: Appointment, dia: Date) => Promise<void>
}) {
  // Consulta sendo arrastada e dia sob o cursor (para destacar o alvo).
  const arrastando = useRef<Appointment | null>(null)
  const [alvo, setAlvo] = useState<string | null>(null)

  // Só consulta agendada se move: concluída e cancelada são histórico.
  const podeMover = (a: Appointment) => a.status === 'scheduled'
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
        <div>
          <h2 className="text-lg font-semibold capitalize">
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Arraste uma consulta para outro dia para remanejar — o horário é mantido.
          </p>
        </div>
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

      <div className="overflow-x-auto">
      <div className="min-w-[680px]">
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
              onDragOver={(e) => {
                if (!arrastando.current) return
                e.preventDefault() // sem isso o navegador recusa o drop
                setAlvo(day.toDateString())
              }}
              onDragLeave={() => setAlvo((v) => (v === day.toDateString() ? null : v))}
              onDrop={(e) => {
                e.preventDefault()
                const appt = arrastando.current
                arrastando.current = null
                setAlvo(null)
                if (appt) onMove(appt, day)
              }}
              className={cn(
                'min-h-[92px] border-b border-r p-1.5 flex flex-col gap-1 transition-colors',
                !inMonth && 'bg-muted/20 text-muted-foreground',
                alvo === day.toDateString() && 'bg-primary/10 ring-2 ring-inset ring-primary/40',
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
                    draggable={podeMover(a)}
                    onDragStart={(e) => {
                      arrastando.current = a
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', a.id) // exigido pelo Firefox
                    }}
                    onDragEnd={() => {
                      arrastando.current = null
                      setAlvo(null)
                    }}
                    onClick={() => onSelect(a)}
                    className={cn(
                      'text-left text-[11px] leading-tight rounded px-1 py-0.5 truncate transition-colors',
                      podeMover(a) && 'cursor-grab active:cursor-grabbing',
                      a.status === 'cancelled'
                        ? 'bg-destructive/10 text-destructive line-through'
                        : a.status === 'completed'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary hover:bg-primary/20',
                    )}
                    title={
                      podeMover(a)
                        ? `${format(new Date(a.appointment_date), 'HH:mm')} ${
                            a.expand?.patient_id?.name || ''
                          } — arraste para outro dia para remanejar`
                        : `${format(new Date(a.appointment_date), 'HH:mm')} ${
                            a.expand?.patient_id?.name || ''
                          }`
                    }
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
  onDelete,
}: {
  appointment: Appointment | null
  onClose: () => void
  onCancel: (id: string) => void
  onComplete: (id: string) => void
  onDelete: (id: string) => void
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

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {a.status === 'scheduled' && (
                <>
                  <Button variant="outline" className="gap-1.5" onClick={() => onComplete(a.id)}>
                    <Check className="w-4 h-4" /> Concluir
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-1.5">
                        <X className="w-4 h-4" /> Cancelar consulta
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar esta consulta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A consulta será marcada como cancelada e os lembretes de WhatsApp ainda
                          não enviados serão removidos. Ela continua aparecendo no histórico da
                          paciente.
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
                </>
              )}

              {/* Excluir vale para qualquer status: o uso é limpar lançamento
                  errado ou duplicado, e esses aparecem tambem como concluída
                  ou cancelada. */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-1.5">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir esta consulta de vez?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Diferente de cancelar: o registro é apagado. A consulta some da agenda e do
                      histórico da paciente, e os lembretes de WhatsApp ainda não enviados vão
                      junto. Não dá para desfazer.
                      <br />
                      <br />
                      Para uma consulta que a paciente desmarcou, prefira <b>Cancelar</b> — assim
                      fica o registro de que ela existiu.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(a.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
