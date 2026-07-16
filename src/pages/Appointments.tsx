import { useEffect, useState } from 'react'
import { getAppointments, Appointment } from '@/services/appointments'
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
import { Calendar as CalendarIcon } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog'

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])

  const load = async () => {
    const data = await getAppointments()
    setAppointments(data)
  }

  useEffect(() => {
    load()
  }, [])
  useRealtime('appointments', load)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agendamentos</h1>
        <NewAppointmentDialog />
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead>Data e Hora</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma consulta agendada
                </TableCell>
              </TableRow>
            )}
            {appointments.map((a) => (
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
                  <Badge
                    variant={
                      a.status === 'scheduled'
                        ? 'default'
                        : a.status === 'completed'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="font-medium"
                  >
                    {a.status === 'scheduled'
                      ? 'Agendado'
                      : a.status === 'completed'
                        ? 'Concluído'
                        : 'Cancelado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
