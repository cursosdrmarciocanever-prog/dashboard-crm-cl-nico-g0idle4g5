import { useCallback, useEffect, useState } from 'react'
import { getScheduledMessages, type ScheduledMessage } from '@/services/scheduled-messages'
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
import { Clock, MessageSquare } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { NewScheduledMessageDialog } from '@/components/NewScheduledMessageDialog'

export default function ScheduledMessages() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])

  const load = useCallback(async () => {
    const data = await getScheduledMessages()
    setMessages(data)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime('scheduled_messages', load)

  const statusConfig = {
    pending: { label: 'Pendente', variant: 'default' as const },
    sent: { label: 'Enviada', variant: 'secondary' as const },
    cancelled: { label: 'Cancelada', variant: 'destructive' as const },
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mensagens Agendadas</h1>
        <NewScheduledMessageDialog />
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead>Agendado para</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhuma mensagem agendada
                </TableCell>
              </TableRow>
            )}
            {messages.map((m) => {
              const status = statusConfig[m.status] || statusConfig.pending
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {format(new Date(m.scheduled_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    {m.expand?.patient_id?.name || 'Desconhecido'}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground max-w-xs truncate"
                    title={m.message_text}
                  >
                    {m.message_text}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="font-medium">
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
