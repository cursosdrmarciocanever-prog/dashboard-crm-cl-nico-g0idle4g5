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
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { NewPatientDialog } from '@/components/NewPatientDialog'

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')

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
              <TableHead>Último Atendimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum paciente localizado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.phone || '-'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.last_visit ? format(new Date(p.last_visit), 'dd/MM/yyyy') : '-'}
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
                    Ver Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
