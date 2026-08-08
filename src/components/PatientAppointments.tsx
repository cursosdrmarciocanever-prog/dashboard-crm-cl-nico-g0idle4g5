import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarCheck, CalendarClock, History, Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog'
import {
  createAppointment,
  getPatientAppointments,
  type Appointment,
} from '@/services/appointments'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PatientAppointmentsProps {
  patientId: string
  /** Avisa a tela de fora para recarregar (o quadro usa isso). */
  onChanged?: () => void
}

const dataHora = (iso: string) => format(new Date(iso), "dd/MM/yyyy 'às' HH:mm")

/**
 * Consultas do paciente, lidas do mesmo calendário da aba Agendamentos — não há
 * um segundo registro para manter em dia.
 *
 * Mostra a PRÓXIMA agendada e a ÚLTIMA realizada em destaque, porque são as duas
 * perguntas que se faz olhando um lead, e lista o histórico anterior abaixo.
 *
 * Permite registrar uma consulta que já aconteceu: paciente antigo, atendido
 * antes do CRM existir, ficaria para sempre sem histórico.
 */
export function PatientAppointments({ patientId, onChanged }: PatientAppointmentsProps) {
  const [consultas, setConsultas] = useState<Appointment[]>([])
  const [carregando, setCarregando] = useState(true)
  const [agendarAberto, setAgendarAberto] = useState(false)
  const [registrarAberto, setRegistrarAberto] = useState(false)
  const [verTodas, setVerTodas] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setConsultas(await getPatientAppointments(patientId))
    } catch {
      setConsultas([])
    } finally {
      setCarregando(false)
    }
  }, [patientId])

  useEffect(() => {
    carregar()
  }, [carregar])

  const { proxima, ultima, anteriores } = useMemo(() => {
    const agora = Date.now()
    const validas = consultas
      .filter((a) => a.status !== 'cancelled' && a.appointment_date)
      .sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date))

    const futuras = validas.filter((a) => +new Date(a.appointment_date) >= agora)
    const passadas = validas.filter((a) => +new Date(a.appointment_date) < agora).reverse()

    return {
      proxima: futuras[0] ?? null,
      ultima: passadas[0] ?? null,
      anteriores: passadas.slice(1),
    }
  }, [consultas])

  const aoMudar = () => {
    carregar()
    onChanged?.()
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando consultas...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Consultas</h4>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setRegistrarAberto(true)}>
          <Plus className="w-3 h-3" /> Registrar anterior
        </Button>
      </div>

      {/* Próxima agendada */}
      <div className="rounded-lg border p-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Próxima consulta</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setAgendarAberto(true)}
          >
            {proxima ? 'Remarcar' : 'Agendar'}
          </Button>
        </div>
        {proxima ? (
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {dataHora(proxima.appointment_date)}
          </p>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">Nenhuma agendada</p>
        )}
        {proxima?.notes && <p className="text-xs text-muted-foreground">{proxima.notes}</p>}
      </div>

      {/* Última realizada */}
      <div className="rounded-lg border p-3 space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Última consulta realizada</span>
        {ultima ? (
          <>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
              {dataHora(ultima.appointment_date)}
            </p>
            {ultima.notes && <p className="text-xs text-muted-foreground">{ultima.notes}</p>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma registrada</p>
        )}
      </div>

      {/* Histórico anterior */}
      {anteriores.length > 0 && (
        <div className="space-y-1.5">
          <button
            onClick={() => setVerTodas((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            {verTodas ? 'Ocultar' : `Ver mais ${anteriores.length} consulta${anteriores.length > 1 ? 's' : ''} anterior${anteriores.length > 1 ? 'es' : ''}`}
          </button>
          {verTodas && (
            <ul className="space-y-1 pl-5">
              {anteriores.map((a) => (
                <li key={a.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{dataHora(a.appointment_date)}</span>
                  {a.notes ? ` — ${a.notes}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Agendar / remarcar: mesmo diálogo da aba Agendamentos */}
      <NewAppointmentDialog
        open={agendarAberto}
        onOpenChange={setAgendarAberto}
        patientId={patientId}
        hideTrigger
        onCreated={aoMudar}
      />

      <RegistrarAnteriorDialog
        patientId={patientId}
        open={registrarAberto}
        onOpenChange={setRegistrarAberto}
        onCreated={aoMudar}
      />
    </div>
  )
}

/**
 * Registra uma consulta que JÁ aconteceu. Entra como 'completed' e com data no
 * passado — assim não dispara confirmação nem lembrete de WhatsApp, que seriam
 * absurdos para uma consulta antiga.
 */
function RegistrarAnteriorDialog({
  patientId,
  open,
  onOpenChange,
  onCreated,
}: {
  patientId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const [data, setData] = useState('')
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data) return

    if (new Date(data).getTime() > Date.now()) {
      toast({
        title: 'Data no futuro',
        description: 'Aqui só entram consultas já realizadas. Para uma consulta futura, use Agendar.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await createAppointment({
        patient_id: patientId,
        appointment_date: new Date(data).toISOString().replace('T', ' ').substring(0, 19) + 'Z',
        status: 'completed',
        notes: notas,
      })
      toast({ title: 'Consulta registrada', description: 'Entrou no histórico do paciente.' })
      setData('')
      setNotas('')
      onOpenChange(false)
      onCreated()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a consulta.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar consulta já realizada</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Para lançar atendimentos anteriores ao CRM. Não envia nenhuma mensagem ao paciente.
          </p>
          <div className="space-y-2">
            <Label>Data e hora da consulta</Label>
            <Input
              type="datetime-local"
              value={data}
              onChange={(e) => setData(e.target.value)}
              onClick={(ev) => {
                const el = ev.currentTarget as HTMLInputElement & { showPicker?: () => void }
                try {
                  el.showPicker?.()
                } catch {
                  /* navegador sem suporte */
                }
              }}
              className={cn('cursor-pointer')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ex: retorno de exames, ajuste de dose..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
