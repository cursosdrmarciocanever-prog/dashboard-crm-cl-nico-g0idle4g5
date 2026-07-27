import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, differenceInCalendarDays } from 'date-fns'
import {
  ArrowLeft,
  Phone,
  Loader2,
  Pencil,
  Trash2,
  Save,
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Calendar,
  MessageSquare,
  Syringe,
  History,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { getPatient, updatePatient, deletePatient, Patient } from '@/services/patients'
import { getPatientAppointments, Appointment } from '@/services/appointments'
import { getConversation, sendMessage, Message } from '@/services/messages'
import { getPatientScheduledMessages, ScheduledMessage } from '@/services/scheduled-messages'
import { getPatientStageHistory, PatientStageHistory } from '@/services/patient-stage-history'
import { JOURNEY_STAGES } from '@/lib/journey-stages'
import { prettyPhone } from '@/lib/phone'
import { formatDuration } from '@/services/stage-history'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  importado: 'Importado',
  site: 'Site',
}

const APPOINTMENT_STATUS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Agendada', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Realizada', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const SCHEDULED_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  sent: { label: 'Enviada', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  failed: { label: 'Falhou', className: 'bg-red-100 text-red-800 border-red-200' },
}

const stageLabel = (s?: string) =>
  JOURNEY_STAGES.find((j) => j.value === s)?.label || s?.replace(/_/g, ' ') || '-'
const stageDot = (s?: string) => JOURNEY_STAGES.find((j) => j.value === s)?.dotClass || 'bg-gray-400'
const dt = (v?: string, pattern = "dd/MM/yyyy 'às' HH:mm") =>
  v ? format(new Date(v), pattern) : '-'

interface EditForm {
  name: string
  phone: string
  status: Patient['status']
  journey_stage: string
}

export default function PacienteDetalhe() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [thread, setThread] = useState<Message[]>([])
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([])
  const [history, setHistory] = useState<PatientStageHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const p = await getPatient(id)
      setPatient(p)
      // As demais consultas são independentes: se uma falhar, o resto da ficha continua.
      const [a, m, s, h] = await Promise.all([
        getPatientAppointments(id).catch(() => []),
        getConversation(id).catch(() => []),
        getPatientScheduledMessages(id).catch(() => []),
        getPatientStageHistory(id).catch(() => []),
      ])
      setAppointments(a)
      setThread(m)
      setScheduled(s)
      setHistory(h)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    load()
  }, [load])

  useRealtime('messages', () => load())
  useRealtime('patients', () => load())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [thread.length])

  const handleSend = async () => {
    const text = reply.trim()
    if (!patient || !text) return
    if (!patient.phone) {
      toast({
        title: 'Sem telefone',
        description: 'Cadastre um telefone antes de enviar.',
        variant: 'destructive',
      })
      return
    }
    setSending(true)
    try {
      await sendMessage(patient.id, patient.phone, text)
      setReply('')
      await load()
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível enviar.', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleStageChange = async (stage: string) => {
    if (!patient) return
    const previous = patient
    setPatient({ ...patient, journey_stage: stage as Patient['journey_stage'] })
    try {
      await updatePatient(patient.id, { journey_stage: stage })
      await load()
    } catch {
      setPatient(previous)
      toast({ title: 'Erro', description: 'Não foi possível mudar o estágio.', variant: 'destructive' })
    }
  }

  const startEdit = () => {
    if (!patient) return
    setForm({
      name: patient.name || '',
      phone: patient.phone || '',
      status: patient.status,
      journey_stage: patient.journey_stage || 'novo_lead',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!patient || !form) return
    setSaving(true)
    try {
      await updatePatient(patient.id, {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        status: form.status,
        journey_stage: form.journey_stage,
      })
      await load()
      setEditing(false)
      toast({ title: 'Salvo', description: 'Paciente atualizado.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!patient) return
    try {
      await deletePatient(patient.id)
      toast({ title: 'Excluído', description: 'O paciente foi removido.' })
      navigate('/pacientes')
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !patient) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/pacientes')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar para Pacientes
        </Button>
      </div>
    )
  }

  const daysToExpire = patient.implant_expires_at
    ? differenceInCalendarDays(new Date(patient.implant_expires_at), new Date())
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground"
        onClick={() => navigate('/pacientes')}
      >
        <ArrowLeft className="w-4 h-4" /> Pacientes
      </Button>

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">
            {patient.name}
          </h1>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              {patient.phone ? prettyPhone(patient.phone) : 'Sem telefone'}
            </span>
            <Badge variant="outline" className="gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', stageDot(patient.journey_stage))} />
              {stageLabel(patient.journey_stage)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {patient.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={startEdit}>
            <Pencil className="w-4 h-4" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir este paciente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso remove <strong>{patient.name}</strong> e também suas conversas, agendamentos e
                  mensagens. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Coluna da esquerda: ficha, implante, histórico */}
        <div className="space-y-6 lg:col-span-1">
          <Section title="Ficha">
            <div className="space-y-2 text-sm">
              <Row label="Origem" value={ORIGIN_LABELS[patient.traffic_platform || ''] || '-'} />
              <Row label="Campanha" value={patient.campaign_name || '-'} />
              <Row label="Cadastrado em" value={dt(patient.created)} />
              <Row label="Último contato" value={dt(patient.last_contact_date)} />
              <Row label="Último atendimento" value={dt(patient.last_visit, 'dd/MM/yyyy')} />
            </div>
            <div className="space-y-2 pt-4">
              <Label className="text-xs text-muted-foreground">Estágio da jornada</Label>
              <Select value={patient.journey_stage || 'novo_lead'} onValueChange={handleStageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOURNEY_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Mudar o estágio dispara a automação configurada para ele.
              </p>
            </div>
          </Section>

          {patient.implant_active && (
            <Section title="Implante hormonal" icon={Syringe}>
              <div className="space-y-2 text-sm">
                <Row label="Colocado em" value={dt(patient.implant_placed_at, 'dd/MM/yyyy')} />
                <Row label="Duração" value={`${patient.implant_duration_months || 12} meses`} />
                <Row label="Vence em" value={dt(patient.implant_expires_at, 'dd/MM/yyyy')} />
                <Row
                  label="Retorno"
                  value={
                    patient.implant_returned_at
                      ? dt(patient.implant_returned_at, 'dd/MM/yyyy')
                      : 'Ainda não registrado'
                  }
                />
              </div>
              {daysToExpire !== null && !patient.implant_returned_at && (
                <p
                  className={cn(
                    'text-sm mt-3 font-medium',
                    daysToExpire < 0
                      ? 'text-destructive'
                      : daysToExpire <= 30
                        ? 'text-amber-600'
                        : 'text-muted-foreground',
                  )}
                >
                  {daysToExpire < 0
                    ? `Vencido há ${Math.abs(daysToExpire)} dia(s)`
                    : daysToExpire === 0
                      ? 'Vence hoje'
                      : `Faltam ${daysToExpire} dia(s)`}
                </p>
              )}
            </Section>
          )}

          <Section title="Histórico de estágios" icon={History}>
            {history.length === 0 ? (
              <Empty>Nenhuma mudança registrada</Empty>
            ) : (
              <ol className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <span
                      className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', stageDot(h.stage))}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{stageLabel(h.stage)}</p>
                      <p className="text-xs text-muted-foreground">
                        {dt(h.entered_at)}
                        {h.duration_hours ? ` · ${formatDuration(h.duration_hours)}` : ''}
                        {!h.exited_at ? ' · atual' : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        {/* Coluna da direita: conversa, consultas, mensagens agendadas */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Conversa no WhatsApp" icon={MessageSquare}>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {thread.length === 0 ? (
                <Empty>Nenhuma mensagem trocada</Empty>
              ) : (
                thread.map((m) => (
                  <div
                    key={m.id}
                    className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                        m.direction === 'out'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <div className="flex items-center gap-1 justify-end mt-1 opacity-70 text-[10px]">
                        {format(new Date(m.created), 'dd/MM HH:mm')}
                        {m.direction === 'out' && <StatusIcon status={m.status} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 pt-3 mt-3 border-t">
              <Input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Escreva uma mensagem..."
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !reply.trim()} className="gap-2">
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </Section>

          <Section title="Consultas" icon={Calendar}>
            {appointments.length === 0 ? (
              <Empty>Nenhuma consulta registrada</Empty>
            ) : (
              <ul className="divide-y">
                {appointments.map((a) => {
                  const st = APPOINTMENT_STATUS[a.status] || {
                    label: a.status,
                    className: '',
                  }
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {dt(a.appointment_date)}
                        </p>
                        {a.notes && (
                          <p className="text-xs text-muted-foreground truncate">{a.notes}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn('shrink-0', st.className)}>
                        {st.label}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          <Section title="Mensagens agendadas" icon={Clock}>
            {scheduled.length === 0 ? (
              <Empty>Nenhuma mensagem agendada</Empty>
            ) : (
              <ul className="divide-y">
                {scheduled.map((s) => {
                  const st = SCHEDULED_STATUS[s.status] || { label: s.status, className: '' }
                  return (
                    <li key={s.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">{s.message_text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dt(s.scheduled_at)}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('shrink-0', st.className)}>
                        {st.label}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Edição */}
      <Dialog open={editing} onOpenChange={(o) => !o && setEditing(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Patient['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estágio da jornada</Label>
                <Select
                  value={form.journey_stage}
                  onValueChange={(v) => setForm({ ...form, journey_stage: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURNEY_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="bg-card border rounded-xl shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{children}</p>
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'queued') return <Clock className="w-3 h-3" />
  if (status === 'sent') return <CheckCheck className="w-3 h-3" />
  if (status === 'failed') return <AlertCircle className="w-3 h-3 text-destructive" />
  return <Check className="w-3 h-3" />
}
