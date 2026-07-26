import { useCallback, useEffect, useState } from 'react'
import {
  getStageTemplates,
  updateStageTemplate,
  type StageTemplate,
} from '@/services/stage-templates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Bot } from 'lucide-react'

const STAGE_LABELS: Record<string, string> = {
  novo_lead: 'Novo lead (boas-vindas)',
  agendamento_confirmado: 'Agendamento confirmado',
  pedido_exames_enviados: 'Pedido de exames enviado',
  exames_recebidos_parcialmente: 'Exames recebidos (parcial)',
  exames_recebidos_completos: 'Exames recebidos (completos)',
  exames_enviados_dr_marcio: 'Exames enviados ao Dr. Marcio',
  exames_recebidos_dr_marcio_vistos: 'Exames analisados pelo Dr. Marcio',
  exames_anexados: 'Exames anexados ao prontuário',
  questionario_enviado: 'Questionário enviado',
  questionario_respondido: 'Questionário respondido',
  consulta_realizada: 'Consulta realizada',
  novo_pedido_exames_fornecido: 'Novo pedido de exames fornecido',
  proxima_consulta_agendada: 'Próxima consulta agendada',
}

// Ordem da jornada (para exibir os cards na sequência real, não alfabética)
const STAGE_ORDER = [
  'novo_lead',
  'agendamento_confirmado',
  'pedido_exames_enviados',
  'exames_recebidos_parcialmente',
  'exames_recebidos_completos',
  'exames_enviados_dr_marcio',
  'exames_recebidos_dr_marcio_vistos',
  'exames_anexados',
  'questionario_enviado',
  'questionario_respondido',
  'consulta_realizada',
  'novo_pedido_exames_fornecido',
  'proxima_consulta_agendada',
]

const stageOrder = (stage: string) => {
  const i = STAGE_ORDER.indexOf(stage)
  return i === -1 ? 999 : i
}

const stageLabel = (stage: string) =>
  STAGE_LABELS[stage] || stage.replace(/_/g, ' ')

export default function Automacoes() {
  const [templates, setTemplates] = useState<StageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getStageTemplates()
      list.sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage))
      setTemplates(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = (id: string, data: Partial<StageTemplate>) =>
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" />
          Automações
        </h1>
        <p className="text-muted-foreground mt-1">
          Mensagens de WhatsApp enviadas automaticamente quando o paciente entra em cada
          estágio da jornada. Use <code className="rounded bg-muted px-1">{'{nome}'}</code>{' '}
          para o primeiro nome do paciente.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary w-6 h-6" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum template encontrado. Aplique a migration 0019 no PocketBase.
        </p>
      ) : (
        templates.map((t) => <TemplateCard key={t.id} template={t} onPatch={patch} toast={toast} />)
      )}
    </div>
  )
}

function TemplateCard({
  template,
  onPatch,
  toast,
}: {
  template: StageTemplate
  onPatch: (id: string, data: Partial<StageTemplate>) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateStageTemplate(template.id, {
        message_text: template.message_text,
        enabled: template.enabled,
        delay_minutes: Number(template.delay_minutes) || 0,
      })
      toast({ title: 'Salvo', description: `Automação "${stageLabel(template.stage)}" atualizada.` })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="text-lg">{stageLabel(template.stage)}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {template.enabled ? 'Ativo' : 'Inativo'}
          </span>
          <Switch
            checked={template.enabled}
            onCheckedChange={(v) => onPatch(template.id, { enabled: v })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea
            rows={3}
            value={template.message_text}
            onChange={(e) => onPatch(template.id, { message_text: e.target.value })}
          />
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2 w-40">
            <Label>Atraso (minutos)</Label>
            <Input
              type="number"
              min={0}
              value={template.delay_minutes ?? 0}
              onChange={(e) => onPatch(template.id, { delay_minutes: Number(e.target.value) })}
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
