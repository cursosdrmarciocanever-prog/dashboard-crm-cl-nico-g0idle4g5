import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Loader2, MessageCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendMessage } from '@/services/messages'
import type { ImplantReminder } from '@/services/implants'
import type { Patient } from '@/services/patients'
import { lembreteSugerido, montarMensagemImplante, usaData } from '@/lib/implant-message'
import { useToast } from '@/hooks/use-toast'

interface Props {
  patient: Patient | null
  reminders: ImplantReminder[]
  open: boolean
  onOpenChange: (v: boolean) => void
}

/**
 * Envia AGORA, na mão, o lembrete de vencimento do implante.
 *
 * A trilha automática já manda nos dias -30, -15 e 0, mas ela não cobre o caso
 * do dia a dia: a paciente ligou, a secretária quer reforçar, o implante já
 * venceu e ninguém respondeu. Este botão resolve isso sem esperar o próximo
 * agendamento.
 *
 * Sai pelo mesmo caminho do Inbox (coleção `messages`), e não por
 * `scheduled_messages`: assim a mensagem vai na hora e fica registrada na
 * conversa da paciente, junto com as respostas dela.
 */
export function EnviarLembreteImplanteDialog({ patient, reminders, open, onOpenChange }: Props) {
  const [templateId, setTemplateId] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const { toast } = useToast()

  // Só os lembretes de vencimento. O de retorno é a lista de exames — outra conversa.
  const opcoes = reminders.filter((r) => r.kind === 'schedule')
  const escolhido = opcoes.find((r) => r.id === templateId)

  const vencimento = patient?.implant_expires_at
  const semTelefone = !patient?.phone?.trim()
  const semData = !vencimento
  const retornou = !!patient?.implant_returned_at

  // Ao abrir: sugere o lembrete mais próximo da situação de hoje e já monta o texto.
  useEffect(() => {
    if (!open || !patient) return
    const sugerido = lembreteSugerido(opcoes, vencimento)
    setTemplateId(sugerido?.id ?? '')
    setTexto(
      sugerido
        ? montarMensagemImplante(sugerido.message_text, {
            nome: patient.name,
            vencimento,
          })
        : '',
    )
    // Recalcular a cada tecla digitada no texto quebraria a edição manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient?.id])

  const trocarTemplate = (id: string) => {
    setTemplateId(id)
    const t = opcoes.find((r) => r.id === id)
    if (t && patient) {
      setTexto(montarMensagemImplante(t.message_text, { nome: patient.name, vencimento }))
    }
  }

  // Bloqueia só quando o texto realmente sairia furado, não sempre que falta data.
  const dataFaltando = semData && !!escolhido && usaData(escolhido.message_text)
  const podeEnviar = !!patient && !semTelefone && !dataFaltando && !!texto.trim() && !enviando

  const enviar = async () => {
    if (!patient || !podeEnviar) return
    setEnviando(true)
    try {
      await sendMessage(patient.id, patient.phone, texto.trim())
      toast({
        title: 'Lembrete enviado',
        description: `Mensagem enviada para ${patient.name} no WhatsApp.`,
      })
      onOpenChange(false)
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar. Confira se o WhatsApp está conectado.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            Enviar lembrete no WhatsApp
          </DialogTitle>
        </DialogHeader>

        {patient && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium text-foreground">{patient.name}</p>
              <p className="text-muted-foreground">{patient.phone || 'sem telefone'}</p>
              <p className="text-muted-foreground">
                Vencimento:{' '}
                {vencimento ? (
                  <span className="font-medium text-foreground">
                    {format(new Date(vencimento), 'dd/MM/yyyy')}
                  </span>
                ) : (
                  'não cadastrado'
                )}
              </p>
            </div>

            {semTelefone && (
              <Aviso tom="erro">
                Esta paciente não tem telefone cadastrado — não há para onde enviar.
              </Aviso>
            )}
            {dataFaltando && (
              <Aviso tom="erro">
                Este lembrete cita a data de vencimento, e ela não está cadastrada. Preencha a data
                de colocação e a duração antes de enviar.
              </Aviso>
            )}
            {retornou && (
              <Aviso tom="atencao">
                Esta paciente já foi marcada como retornada. Confirme se o lembrete ainda faz
                sentido.
              </Aviso>
            )}

            <div className="space-y-2">
              <Label>Lembrete</Label>
              <Select value={templateId} onValueChange={trocarTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lembrete..." />
                </SelectTrigger>
                <SelectContent>
                  {opcoes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                      {r.enabled ? '' : ' (automático desligado)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Dá para editar antes de enviar. Vai exatamente como está escrito aqui e fica
                registrado na conversa da paciente.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!podeEnviar} className="gap-2">
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            Enviar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Aviso({ tom, children }: { tom: 'erro' | 'atencao'; children: React.ReactNode }) {
  const cor =
    tom === 'erro'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : 'border-amber-400/50 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${cor}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
