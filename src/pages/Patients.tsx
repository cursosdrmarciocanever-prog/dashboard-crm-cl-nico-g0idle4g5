import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listPatients, updatePatient, deletePatient, Patient } from '@/services/patients'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Search, Pencil, Trash2, Loader2, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { NewPatientDialog } from '@/components/NewPatientDialog'

const PER_PAGE = 50

const STAGE_LABELS: Record<string, string> = {
  novo_lead: 'Novo lead',
  agendamento_confirmado: 'Agendamento confirmado',
  pedido_exames_enviados: 'Pedido de exames enviado',
  exames_recebidos_parcialmente: 'Exames recebidos (parcial)',
  exames_recebidos_completos: 'Exames recebidos (completos)',
  exames_enviados_dr_marcio: 'Exames enviados ao Dr. Marcio',
  exames_recebidos_dr_marcio_vistos: 'Exames analisados pelo Dr. Marcio',
  exames_anexados: 'Exames anexados',
  questionario_enviado: 'Questionário enviado',
  questionario_respondido: 'Questionário respondido',
  consulta_realizada: 'Consulta realizada',
  novo_pedido_exames_fornecido: 'Novo pedido de exames',
  proxima_consulta_agendada: 'Próxima consulta agendada',
}
const STAGES = Object.keys(STAGE_LABELS)

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  importado: 'Importado',
  site: 'Site',
}

const stageLabel = (s?: string) => (s ? STAGE_LABELS[s] || s.replace(/_/g, ' ') : '-')
const originLabel = (o?: string) => (o ? ORIGIN_LABELS[o] || o : '-')

interface EditForm {
  name: string
  phone: string
  status: Patient['status']
  journey_stage: string
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<Patient | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const res = await listPatients(p, PER_PAGE, q)
      setPatients(res.items)
      setTotalPages(res.totalPages || 1)
      setTotalItems(res.totalItems || 0)
    } catch {
      // ignora
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    load(1, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Busca (debounce) — reinicia para a página 1
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      load(1, search)
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Sincroniza com ?q vindo da busca do cabeçalho
  useEffect(() => {
    if (searchParams.has('q')) setSearch(searchParams.get('q') || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useRealtime('patients', () => load(page, search))

  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages)
    setPage(next)
    load(next, search)
  }

  const openPatient = (p: Patient) => {
    setSelected(p)
    setEditing(false)
  }

  const startEdit = () => {
    if (!selected) return
    setForm({
      name: selected.name || '',
      phone: selected.phone || '',
      status: selected.status,
      journey_stage: selected.journey_stage || 'novo_lead',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!selected || !form) return
    setSaving(true)
    try {
      await updatePatient(selected.id, {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        status: form.status,
        journey_stage: form.journey_stage,
      })
      await load(page, search)
      setEditing(false)
      setSelected(null)
      toast({ title: 'Salvo', description: 'Paciente atualizado.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePatient(id)
      await load(page, search)
      setSelected(null)
      toast({ title: 'Excluído', description: 'O lead foi removido.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pacientes</h1>
        <NewPatientDialog />
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between gap-4 bg-muted/10 flex-wrap">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {totalItems} paciente{totalItems === 1 ? '' : 's'}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            )}
            {!loading && patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum paciente localizado
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {originLabel(p.traffic_platform)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {stageLabel(p.journey_stage)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('font-medium', {
                        'bg-green-100 text-green-800 border-green-200': p.status === 'ativo',
                        'bg-blue-100 text-blue-800 border-blue-200': p.status === 'concluido',
                        'bg-gray-100 text-gray-600 border-gray-200': p.status === 'inativo',
                      })}
                    >
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80"
                      onClick={() => openPatient(p)}
                    >
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/5">
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page >= totalPages || loading}
                onClick={() => goToPage(page + 1)}
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && (setSelected(null), setEditing(false))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar paciente' : selected?.name}</DialogTitle>
          </DialogHeader>

          {selected && !editing && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Telefone" value={selected.phone || '-'} />
              <DetailRow label="Origem" value={originLabel(selected.traffic_platform)} />
              <DetailRow label="Estágio da jornada" value={stageLabel(selected.journey_stage)} />
              <DetailRow
                label="Status"
                value={selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
              />
              <DetailRow
                label="Último contato"
                value={
                  selected.last_contact_date
                    ? format(new Date(selected.last_contact_date), 'dd/MM/yyyy HH:mm')
                    : '-'
                }
              />
              <DetailRow
                label="Cadastrado em"
                value={
                  selected.created ? format(new Date(selected.created), 'dd/MM/yyyy HH:mm') : '-'
                }
              />

              <div className="flex justify-between gap-2 pt-3">
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
                      <AlertDialogTitle>Excluir este lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso remove <strong>{selected.name}</strong> e também suas conversas,
                        agendamentos e mensagens. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(selected.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sim, excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button className="gap-1.5" onClick={startEdit}>
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
              </div>
            </div>
          )}

          {selected && editing && form && (
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
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  )
}
