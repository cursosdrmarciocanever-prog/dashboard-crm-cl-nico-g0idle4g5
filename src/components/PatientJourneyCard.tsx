import { useState } from 'react'
import { format } from 'date-fns'
import { Phone, Calendar as CalendarIcon, ChevronRight, Globe } from 'lucide-react'
import type { Patient } from '@/services/patients'
import { cn } from '@/lib/utils'

interface PatientJourneyCardProps {
  patient: Patient
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

export function PatientJourneyCard({
  patient,
  onClick,
  onDragStart,
  onDragEnd,
}: PatientJourneyCardProps) {
  const [isDragging, setIsDragging] = useState(false)

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
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground truncate">{patient.name}</p>
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
    </div>
  )
}
