import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Phone,
  Calendar,
  User,
  ArrowRight,
  FileText,
  FileCheck,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Patient, updatePatient } from '@/services/patients'
import { JOURNEY_STAGES, type JourneyStage } from '@/lib/journey-stages'
import { cn } from '@/lib/utils'

interface PatientDetailPanelProps {
  patient: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

const CHECKLIST = [
  { key: 'exams_sent_flag', label: 'Marcar lista de exames enviada', icon: FileText },
  { key: 'exams_received_flag', label: 'Marcar PDF de exames recebido', icon: FileCheck },
  {
    key: 'anamnesis_sent_flag',
    label: 'Marcar questionário de anamnese enviado',
    icon: ClipboardList,
  },
  {
    key: 'questionnaire_answered_flag',
    label: 'Marcar questionário respondido',
    icon: CheckCircle2,
  },
] as const

export function PatientDetailPanel({
  patient,
  open,
  onOpenChange,
  onUpdated,
}: PatientDetailPanelProps) {
  const [local, setLocal] = useState<Patient | null>(patient)

  useEffect(() => {
    setLocal(patient)
  }, [patient])

  const handleFlagToggle = async (flag: string, value: boolean) => {
    if (!local) return
    setLocal((prev) => (prev ? { ...prev, [flag]: value } : prev))
    try {
      await updatePatient(local.id, { [flag]: value })
      onUpdated()
    } catch {
      setLocal(patient)
    }
  }

  const handleStageChange = async (stage: string) => {
    if (!local) return
    setLocal((prev) => (prev ? { ...prev, journey_stage: stage as JourneyStage } : prev))
    try {
      await updatePatient(local.id, { journey_stage: stage })
      onUpdated()
    } catch {
      setLocal(patient)
    }
  }

  const currentStage = JOURNEY_STAGES.find((s) => s.value === local?.journey_stage)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {!local ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Nenhum paciente selecionado</p>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span
                  className={cn('w-3 h-3 rounded-full', currentStage?.dotClass || 'bg-gray-400')}
                />
                {local.name}
              </SheetTitle>
              <SheetDescription>Detalhes e checklist de pré-consulta</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{local.phone || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {local.last_contact_date
                      ? format(new Date(local.last_contact_date), "dd/MM/yyyy 'às' HH:mm")
                      : 'Sem registro'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline" className="capitalize">
                    {local.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estágio da Jornada</Label>
                <Select value={local.journey_stage || 'lead'} onValueChange={handleStageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURNEY_STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {local.journey_stage === 'lead' && (
                <Button
                  className="w-full gap-2"
                  onClick={() => handleStageChange('appointment_confirmed')}
                >
                  Confirmar Agendamento <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Checklist de Pré-consulta</h4>
                {CHECKLIST.map((item) => {
                  const Icon = item.icon
                  const checked = Boolean(local[item.key as keyof Patient])
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors',
                        checked ? 'bg-green-50 border-green-200' : 'bg-card border-border',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          className={cn(
                            'w-4 h-4 flex-shrink-0',
                            checked ? 'text-green-600' : 'text-muted-foreground',
                          )}
                        />
                        <span className={cn('text-sm', checked && 'text-green-700 font-medium')}>
                          {item.label}
                        </span>
                      </div>
                      <Switch
                        checked={checked}
                        onCheckedChange={(v) => handleFlagToggle(item.key, v)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
