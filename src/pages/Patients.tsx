import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPatients, Patient } from '@/services/patients'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { NewPatientDialog } from '@/components/NewPatientDialog'

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

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  importado: 'Importado',
  site: 'Site',
}

const stageLabel = (s?: string) => (s ? STAGE_LABELS[s] || s.replace(/_/g, ' ') : '-')
const originLabel = (o?: string) => (o ? ORIGIN_LABELS[o] || o : '-')

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [selected, setSelected] = useState<Patient | null>(null)

  const load = async () => {
    const data = await getPatients()
    setPatients(data)
  }

  useEffect(() => {
    load()
  }, [])
  useRealtime('patients', load)

  useEffect(() => {
    if (searchParams.has('q')) {
      setSearch(searchParams.get('q')!)
    }
  }, [searchParams])

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pacientes</h1>
        <NewPatientDialog />
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center gap-4 bg-muted/10">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pacientes por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum paciente localizado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.phone || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{originLabel(p.traffic_platform)}</TableCell>
                <TableCell className="text-muted-foreground">{stageLabel(p.journey_stage)}</TableCell>
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
                    onClick={() => setSelected(p)}
                  >
                    Ver Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
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
                label="Último atendimento"
                value={selected.last_visit ? format(new Date(selected.last_visit), 'dd/MM/yyyy') : '-'}
              />
              <DetailRow
                label="Cadastrado em"
                value={selected.created ? format(new Date(selected.created), 'dd/MM/yyyy HH:mm') : '-'}
              />
              {selected.campaign_name && (
                <DetailRow label="Campanha" value={selected.campaign_name} />
              )}
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
