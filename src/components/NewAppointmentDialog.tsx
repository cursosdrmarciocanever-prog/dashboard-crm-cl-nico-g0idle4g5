import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createAppointment } from '@/services/appointments'
import { getPatients, Patient } from '@/services/patients'
import { useToast } from '@/hooks/use-toast'
import { validarAgendamento } from '@/lib/appointment-time'
import { avisoDeBloqueio, bloqueioNoInstante } from '@/lib/agenda-block'
import { useAgendaBlocks } from '@/hooks/use-agenda-blocks'
import { SeletorDataHora } from '@/components/SeletorDataHora'
import { Loader2, Clock } from 'lucide-react'

interface NewAppointmentDialogProps {
  /** Modo controlado: o sistema abre o diálogo (ex.: cobrança de retorno). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Já vem com este paciente selecionado. */
  patientId?: string
  /** Esconde o botão que abre o diálogo (usado no modo controlado). */
  hideTrigger?: boolean
  /** Explicação exibida no topo, quando o diálogo foi aberto pelo sistema. */
  notice?: string
  onCreated?: () => void
}

export function NewAppointmentDialog({
  open: openProp,
  onOpenChange,
  patientId: patientIdProp,
  hideTrigger,
  notice,
  onCreated,
}: NewAppointmentDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : internalOpen
  const setOpen = (v: boolean) => {
    if (!controlled) setInternalOpen(v)
    onOpenChange?.(v)
  }
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const { toast } = useToast()
  const { blocos } = useAgendaBlocks()

  const [patientId, setPatientId] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      getPatients()
        .then(setPatients)
        .catch(() => {})
      if (patientIdProp) setPatientId(patientIdProp)
    }
  }, [open, patientIdProp])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !date) return
    const problema = validarAgendamento(date)
    if (problema) {
      toast({ title: 'Não dá para agendar', description: problema, variant: 'destructive' })
      return
    }
    const bloqueio = bloqueioNoInstante(blocos, new Date(date))
    if (bloqueio) {
      toast({
        title: 'Não dá para agendar',
        description: avisoDeBloqueio(bloqueio),
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const formattedDate = new Date(date).toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      await createAppointment({
        patient_id: patientId,
        appointment_date: formattedDate,
        status: 'scheduled',
        notes,
      })
      toast({ title: 'Sucesso', description: 'Consulta agendada.' })
      setOpen(false)
      setPatientId('')
      setDate('')
      setNotes('')
      onCreated?.()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao agendar.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 shadow-sm">
            <Clock className="w-4 h-4" /> Agendar Consulta
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Consulta</DialogTitle>
        </DialogHeader>
        {notice && (
          <p className="text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800">
            {notice}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um paciente..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data e Hora da Consulta</Label>
            <SeletorDataHora value={date} onChange={setDate} />
            <p className="text-xs text-muted-foreground">
              Atendimento de segunda a sexta, das 07:00 às 11:30 e das 13:30 às 18:00. A
              confirmação por WhatsApp só é enviada depois que a data e a hora forem preenchidas.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Observações Clínicas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da consulta, exames pendentes..."
              className="resize-none"
              rows={3}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Agendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
