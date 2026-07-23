import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getPatients, Patient } from '@/services/patients'
import { getAppointments, Appointment } from '@/services/appointments'
import { useRealtime } from '@/hooks/use-realtime'
import { format, isToday, isAfter, isBefore, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { NewPatientDialog } from '@/components/NewPatientDialog'
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog'
import { FloatingWhatsAppButton } from '@/components/FloatingWhatsAppButton'

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filter, setFilter] = useState<'all' | 'today' | 'next7days'>('all')

  const loadData = async () => {
    try {
      const [pData, aData] = await Promise.all([
        getPatients(),
        getAppointments('status = "scheduled"'),
      ])
      setPatients(pData)
      setAppointments(aData)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('patients', () => loadData())
  useRealtime('appointments', () => loadData())

  const todayAppointments = useMemo(
    () => appointments.filter((a) => isToday(new Date(a.appointment_date))),
    [appointments],
  )

  const next7DaysAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.appointment_date)
        return isAfter(d, new Date()) && isBefore(d, addDays(new Date(), 7))
      }),
    [appointments],
  )

  const filteredPatients = useMemo(() => {
    return patients.slice(0, 10)
  }, [patients, filter])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo de volta ao seu painel clínico.</p>
        </div>
        <div className="flex items-center gap-3">
          <NewAppointmentDialog />
          <NewPatientDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pacientes Cadastrados</p>
              <h3 className="text-3xl font-bold mt-2">{patients.length}</h3>
            </div>
            <div className="bg-primary/10 p-4 rounded-full">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Consultas do Dia</p>
              <h3 className="text-3xl font-bold mt-2">{todayAppointments.length}</h3>
            </div>
            <div className="bg-secondary/10 p-4 rounded-full">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Próximas Consultas</p>
              <h3 className="text-3xl font-bold mt-2">{next7DaysAppointments.length}</h3>
            </div>
            <div className="bg-blue-100 p-4 rounded-full">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border rounded-xl shadow-sm">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold">Pacientes Recentes</h2>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={filter === 'today' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter('today')}
            >
              Hoje
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[300px]">Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Último Atendimento</TableHead>
                <TableHead>Status do Tratamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum paciente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      </div>
      <FloatingWhatsAppButton />
    </div>
  )
}
