import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listPatients, Patient } from '@/services/patients'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { NewPatientDialog } from '@/components/NewPatientDialog'
import { JOURNEY_STAGES } from '@/lib/journey-stages'

const PER_PAGE = 50

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  importado: 'Importado',
  site: 'Site',
}

const stageLabel = (s?: string) =>
  JOURNEY_STAGES.find((j) => j.value === s)?.label || s?.replace(/_/g, ' ') || '-'
const originLabel = (o?: string) => (o ? ORIGIN_LABELS[o] || o : '-')

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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

  const openPatient = (p: Patient) => navigate(`/pacientes/${p.id}`)

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
        <div className="overflow-x-auto">
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
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openPatient(p)}
                  >
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
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        Abrir painel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

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
    </div>
  )
}
