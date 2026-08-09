import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getImplantPatients,
  setImplant,
  markImplantReturn,
  removeImplant,
  getImplantReminders,
  updateImplantReminder,
  type ImplantReminder,
} from '@/services/implants'
import { listPatients, type Patient } from '@/services/patients'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, differenceInCalendarDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Syringe,
  Plus,
  Check,
  Loader2,
  Save,
  X,
  CalendarClock,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImportImplantsDialog } from '@/components/ImportImplantsDialog'
import { EnviarLembreteImplanteDialog } from '@/components/EnviarLembreteImplanteDialog'
import { SeletorDePrazo } from '@/components/SeletorDePrazo'

const ANCORA_IMPLANTE = {
  zero: 'no dia do vencimento',
  antes: 'antes do vencimento',
  depois: 'depois do vencimento',
}

export default function Implantes() {
  const [rows, setRows] = useState<Patient[]>([])
  const [reminders, setReminders] = useState<ImplantReminder[]>([])
  const [loading, setLoading] = useState(true)
  // Paciente cujo lembrete está sendo escrito para envio manual (null = fechado).
  const [lembretePara, setLembretePara] = useState<Patient | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, r] = await Promise.all([getImplantPatients(), getImplantReminders()])
      setRows(p)
      setReminders(r)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime('patients', load)

  const handleReturn = async (p: Patient) => {
    try {
      await markImplantReturn(p.id)
      await load()
      toast({
        title: 'Retorno registrado',
        description: 'Lembretes pendentes cancelados e lista de exames enviada.',
      })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível registrar.', variant: 'destructive' })
    }
  }

  const handleRemove = async (p: Patient) => {
    try {
      await removeImplant(p.id)
      await load()
      toast({ title: 'Removida', description: 'Paciente saiu do acompanhamento de implantes.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Syringe className="w-7 h-7 text-primary" />
            Implantes Hormonais
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento das pacientes com implante e lembretes automáticos de vencimento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportImplantsDialog onDone={load} />
          <AddImplantDialog onDone={load} />
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Colocação</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma paciente em acompanhamento. Use “Adicionar paciente”.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((p) => {
                const exp = p.implant_expires_at ? new Date(p.implant_expires_at) : null
                const days = exp ? differenceInCalendarDays(exp, new Date()) : null
                const returned = !!p.implant_returned_at
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link to={`/pacientes/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.phone}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.implant_placed_at
                        ? format(new Date(p.implant_placed_at), 'dd/MM/yyyy')
                        : '-'}
                      {p.implant_duration_months ? ` · ${p.implant_duration_months} meses` : ''}
                    </TableCell>
                    <TableCell>
                      {exp ? (
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-muted-foreground" />
                          <span>{format(exp, 'dd/MM/yyyy')}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {returned ? (
                        <Badge variant="secondary">Retornou</Badge>
                      ) : days === null ? (
                        <Badge variant="outline">—</Badge>
                      ) : days < 0 ? (
                        <Badge variant="destructive">Vencido há {Math.abs(days)}d</Badge>
                      ) : days === 0 ? (
                        <Badge variant="destructive">Vence hoje</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(days <= 30 && 'border-amber-400 text-amber-700')}
                        >
                          Faltam {days}d
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-emerald-600"
                        onClick={() => setLembretePara(p)}
                        title="Enviar agora o lembrete de vencimento no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" /> Lembrete
                      </Button>
                      {!returned && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-primary"
                          onClick={() => handleReturn(p)}
                        >
                          <Check className="w-4 h-4" /> Marcar retorno
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => handleRemove(p)}
                        title="Remover do acompanhamento"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Mensagens automáticas</h2>
        <p className="text-sm text-muted-foreground -mt-2">
          Enviadas com base na data de vencimento. Use{' '}
          <code className="rounded bg-muted px-1">{'{nome}'}</code> e{' '}
          <code className="rounded bg-muted px-1">{'{data}'}</code> (data do vencimento).
        </p>
        {reminders.map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            onPatch={(id, data) =>
              setReminders((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)))
            }
            toast={toast}
          />
        ))}
      </section>

      <EnviarLembreteImplanteDialog
        patient={lembretePara}
        reminders={reminders}
        open={!!lembretePara}
        onOpenChange={(v) => {
          if (!v) setLembretePara(null)
        }}
      />
    </div>
  )
}

function AddImplantDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Patient[]>([])
  const [query, setQuery] = useState('')
  const [patientId, setPatientId] = useState('')
  const [placedAt, setPlacedAt] = useState('')
  const [months, setMonths] = useState('12')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      const res = await listPatients(1, 20, query)
      setOptions(res.items)
    }, 300)
    return () => clearTimeout(t)
  }, [open, query])

  const handleSave = async () => {
    if (!patientId || !placedAt) return
    setSaving(true)
    try {
      const iso = new Date(placedAt).toISOString()
      await setImplant(patientId, iso, Number(months) || 12)
      toast({ title: 'Adicionada', description: 'Lembretes agendados automaticamente.' })
      setOpen(false)
      setPatientId('')
      setPlacedAt('')
      setQuery('')
      onDone()
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paciente com implante</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar paciente</Label>
            <Input
              placeholder="Digite o nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data da colocação</Label>
            <Input type="date" value={placedAt} onChange={(e) => setPlacedAt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Duração (meses)</Label>
            <Input
              type="number"
              min={1}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O vencimento é calculado automaticamente.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !patientId || !placedAt}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReminderCard({
  reminder,
  onPatch,
  toast,
}: {
  reminder: ImplantReminder
  onPatch: (id: string, data: Partial<ImplantReminder>) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateImplantReminder(reminder.id, {
        message_text: reminder.message_text,
        enabled: reminder.enabled,
        offset_days: Number(reminder.offset_days) || 0,
      })
      toast({ title: 'Salvo', description: `"${reminder.label}" atualizado.` })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-lg">{reminder.label}</CardTitle>
          {reminder.only_if_no_return && (
            <Badge variant="outline" className="font-normal">
              só quem não retornou
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {reminder.enabled ? 'Ativo' : 'Inativo'}
          </span>
          <Switch
            checked={reminder.enabled}
            onCheckedChange={(v) => onPatch(reminder.id, { enabled: v })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          rows={reminder.kind === 'return' ? 8 : 3}
          value={reminder.message_text}
          onChange={(e) => onPatch(reminder.id, { message_text: e.target.value })}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* O de retorno sai quando a paciente é marcada como retornada — não
              tem prazo para ajustar. */}
          {reminder.kind === 'schedule' ? (
            <SeletorDePrazo
              minutos={(Number(reminder.offset_days) || 0) * 1440}
              onChange={(min) => onPatch(reminder.id, { offset_days: min / 1440 })}
              unidades={['dias']}
              ancora={ANCORA_IMPLANTE}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Enviado na hora em que a paciente é marcada como retornada.
            </p>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
