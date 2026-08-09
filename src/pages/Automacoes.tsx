import { useCallback, useEffect, useState } from 'react'
import {
  getStageTemplates,
  updateStageTemplate,
  type StageTemplate,
} from '@/services/stage-templates'
import {
  getAppointmentReminders,
  updateAppointmentReminder,
  type AppointmentReminder,
} from '@/services/appointment-reminders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SeletorDePrazo } from '@/components/SeletorDePrazo'
import { descrever } from '@/lib/offset'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Bot, CalendarClock } from 'lucide-react'

const ANCORA_CONSULTA = {
  zero: 'no horário da consulta',
  antes: 'antes da consulta',
  depois: 'depois da consulta',
}

const ANCORA_ESTAGIO = {
  zero: 'assim que o paciente entra no estágio',
  antes: 'antes de entrar no estágio',
  depois: 'depois de entrar no estágio',
}

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

const STAGE_ORDER = Object.keys(STAGE_LABELS)

const stageOrder = (stage: string) => {
  const i = STAGE_ORDER.indexOf(stage)
  return i === -1 ? 999 : i
}

const stageLabel = (stage: string) => STAGE_LABELS[stage] || stage.replace(/_/g, ' ')

export default function Automacoes() {
  const [templates, setTemplates] = useState<StageTemplate[]>([])
  const [reminders, setReminders] = useState<AppointmentReminder[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tpls, rems] = await Promise.all([getStageTemplates(), getAppointmentReminders()])
      tpls.sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage))
      setTemplates(tpls)
      setReminders(rems)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patchTpl = (id: string, data: Partial<StageTemplate>) =>
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  const patchRem = (id: string, data: Partial<AppointmentReminder>) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)))

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" />
          Automações
        </h1>
        <p className="text-muted-foreground mt-1">
          Mensagens de WhatsApp enviadas automaticamente. Use{' '}
          <code className="rounded bg-muted px-1">{'{nome}'}</code> para o nome do paciente
          {' '}(e <code className="rounded bg-muted px-1">{'{data}'}</code>,{' '}
          <code className="rounded bg-muted px-1">{'{hora}'}</code> nos lembretes e na confirmação de
          agendamento).
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary w-6 h-6" />
        </div>
      ) : (
        <>
          {/* Lembretes de consulta (ancorados na data do agendamento) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Lembretes de consulta</h2>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Disparados automaticamente com base na data marcada em Agendamentos.
            </p>
            {reminders.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum lembrete. Aplique a migration 0021 no PocketBase.
              </p>
            ) : (
              reminders.map((r) => (
                <ReminderCard key={r.id} reminder={r} onPatch={patchRem} toast={toast} />
              ))
            )}
          </section>

          {/* Follow-ups por estágio da jornada */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Follow-ups por estágio</h2>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Enviados quando o paciente entra em cada estágio da jornada.
            </p>
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} onPatch={patchTpl} toast={toast} />
            ))}
          </section>
        </>
      )}
    </div>
  )
}

function ReminderCard({
  reminder,
  onPatch,
  toast,
}: {
  reminder: AppointmentReminder
  onPatch: (id: string, data: Partial<AppointmentReminder>) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateAppointmentReminder(reminder.id, {
        message_text: reminder.message_text,
        enabled: reminder.enabled,
        offset_hours: Number(reminder.offset_hours) || 0,
      })
      toast({ title: 'Salvo', description: `Lembrete "${reminder.label}" atualizado.` })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{reminder.label}</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {descrever((Number(reminder.offset_hours) || 0) * 60, ANCORA_CONSULTA, [
              'dias',
              'horas',
            ])}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {reminder.enabled ? 'Ativo' : 'Inativo'}
          </span>
          <Switch
            checked={reminder.enabled}
            onCheckedChange={(v) => onPatch(reminder.id, { enabled: v })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea
            rows={3}
            value={reminder.message_text}
            onChange={(e) => onPatch(reminder.id, { message_text: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SeletorDePrazo
            minutos={(Number(reminder.offset_hours) || 0) * 60}
            onChange={(min) => onPatch(reminder.id, { offset_hours: min / 60 })}
            unidades={['dias', 'horas']}
            ancora={ANCORA_CONSULTA}
          />
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SeletorDePrazo
            minutos={Number(template.delay_minutes) || 0}
            onChange={(min) => onPatch(template.id, { delay_minutes: min })}
            unidades={['dias', 'horas', 'minutos']}
            sentidos={['depois']}
            rotulo="Esperar antes de enviar"
            ancora={ANCORA_ESTAGIO}
          />
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
