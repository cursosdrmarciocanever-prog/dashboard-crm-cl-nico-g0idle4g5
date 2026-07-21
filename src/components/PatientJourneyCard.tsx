import { useState } from 'react'
import { format } from 'date-fns'
import {
  Phone,
  Calendar as CalendarIcon,
  ChevronRight,
  Globe,
  AlertTriangle,
  Check,
  Circle,
  CircleDot,
  Loader2,
} from 'lucide-react'
import type { Patient } from '@/services/patients'
import { updatePatient } from '@/services/patients'
import type { StagnationInfo } from '@/lib/stagnation'
import {
  POST_CONSULTATION_CHECKLIST,
  getChecklistStatus,
  type ChecklistStatus,
} from '@/lib/post-consultation-checklist'
import { cn } from '@/lib/utils'

interface PatientJourneyCardProps {
  patient: Patient
  stagnation?: StagnationInfo
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

const statusConfig: Record<
  ChecklistStatus,
  { icon: typeof Check; className: string; labelClassName: string }
> = {
  completed: {
    icon: Check,
    className: 'text-green-600 dark:text-green-400',
    labelClassName: 'text-muted-foreground line-through',
  },
  active: {
    icon: CircleDot,
    className: 'text-primary',
    labelClassName: 'text-foreground font-medium',
  },
  pending: {
    icon: Circle,
    className: 'text-muted-foreground/50',
    labelClassName: 'text-muted-foreground/70',
  },
}

export function PatientJourneyCard({
  patient,
  stagnation,
  onClick,
  onDragStart,
  onDragEnd,
}: PatientJourneyCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [updatingStage, setUpdatingStage] = useState<string | null>(null)
  const isStagnant = stagnation?.isStagnant ?? false

  const handleChecklistClick = async (e: React.MouseEvent, stage: typeof patient.journey_stage) => {
    e.stopPropagation()
    if (!stage || patient.journey_stage === stage || updatingStage) return
    setUpdatingStage(stage)
    try {
      await updatePatient(patient.id, { journey_stage: stage })
    } finally {
      setUpdatingStage(null)
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
        setIsDragging(true)
      }}
      onDragEnd={() => {
        onDragEnd()
        setIsDragging(false)
      }}
      onClick={onClick}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group',
        isDragging && 'opacity-50',
        isStagnant && 'border-red-400 bg-red-50/50 dark:bg-red-950/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm text-foreground truncate">{patient.name}</p>
            {isStagnant && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white flex-shrink-0"
                title="Paciente estagnado"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          {patient.phone && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Phone className="w-3 h-3 flex-shrink-0" /> {patient.phone}
            </p>
          )}
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <CalendarIcon className="w-3 h-3 flex-shrink-0" />
            {patient.last_contact_date
              ? format(new Date(patient.last_contact_date), 'dd/MM/yyyy')
              : 'Sem registro'}
          </p>
          {patient.traffic_platform && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Globe className="w-3 h-3 flex-shrink-0" />
              {patient.traffic_platform}
            </p>
          )}
          {isStagnant && stagnation?.displayLabel && (
            <p className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 mt-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              {stagnation.displayLabel}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {(patient.exams_sent_flag ||
        patient.exams_received_flag ||
        patient.anamnesis_sent_flag ||
        patient.questionnaire_answered_flag) && (
        <div className="flex gap-1.5 mt-2">
          {patient.exams_sent_flag && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Exames enviados" />
          )}
          {patient.exams_received_flag && (
            <span className="w-2 h-2 rounded-full bg-orange-500" title="Exames recebidos" />
          )}
          {patient.anamnesis_sent_flag && (
            <span className="w-2 h-2 rounded-full bg-purple-500" title="Questionário enviado" />
          )}
          {patient.questionnaire_answered_flag && (
            <span className="w-2 h-2 rounded-full bg-green-500" title="Questionário respondido" />
          )}
        </div>
      )}

      <div className="mt-2.5 pt-2.5 border-t border-border/60">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1.5">
          Pós-Consulta
        </p>
        <div className="space-y-0.5">
          {POST_CONSULTATION_CHECKLIST.map((item) => {
            const status = getChecklistStatus(patient.journey_stage, item.stage)
            const config = statusConfig[status]
            const Icon = config.icon
            const isUpdating = updatingStage === item.stage

            return (
              <button
                key={item.stage}
                onClick={(e) => handleChecklistClick(e, item.stage)}
                disabled={isUpdating || status === 'active'}
                className={cn(
                  'flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded-md transition-colors touch-target',
                  'hover:bg-muted/60 disabled:cursor-default disabled:opacity-60',
                  status === 'active' && 'bg-primary/10',
                )}
              >
                {isUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
                ) : (
                  <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', config.className)} />
                )}
                <span className={cn('text-xs truncate', config.labelClassName)}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
