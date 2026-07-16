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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPatients, type Patient } from '@/services/patients'
import { createScheduledMessage } from '@/services/scheduled-messages'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus } from 'lucide-react'

export function NewScheduledMessageDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const { toast } = useToast()

  const [patientId, setPatientId] = useState('')
  const [messageText, setMessageText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  useEffect(() => {
    if (open) {
      getPatients()
        .then(setPatients)
        .catch(() => {})
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !messageText || !scheduledAt) return
    setLoading(true)
    try {
      await createScheduledMessage({
        patient_id: patientId,
        message_text: messageText,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: 'pending',
      })
      toast({ title: 'Sucesso', description: 'Mensagem agendada com sucesso.' })
      setOpen(false)
      setPatientId('')
      setMessageText('')
      setScheduledAt('')
    } catch {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao agendar.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nova Mensagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Mensagem Agendada</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um paciente" />
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
            <Label>Mensagem</Label>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              required
              placeholder="Digite a mensagem a ser enviada..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Data e Hora de Envio</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Agendar Mensagem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
