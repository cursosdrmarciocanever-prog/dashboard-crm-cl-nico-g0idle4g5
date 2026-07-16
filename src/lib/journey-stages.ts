export type JourneyStage =
  | 'lead'
  | 'appointment_confirmed'
  | 'exams_sent'
  | 'exams_received'
  | 'questionnaire_sent'
  | 'questionnaire_answered'

export interface JourneyStageConfig {
  value: JourneyStage
  label: string
  dotClass: string
  headerClass: string
}

export const JOURNEY_STAGES: JourneyStageConfig[] = [
  {
    value: 'lead',
    label: 'Lead',
    dotClass: 'bg-blue-500',
    headerClass: 'text-blue-700',
  },
  {
    value: 'appointment_confirmed',
    label: 'Agendamento Confirmado',
    dotClass: 'bg-cyan-500',
    headerClass: 'text-cyan-700',
  },
  {
    value: 'exams_sent',
    label: 'Exames Enviados',
    dotClass: 'bg-amber-500',
    headerClass: 'text-amber-700',
  },
  {
    value: 'exams_received',
    label: 'Exames Recebidos',
    dotClass: 'bg-orange-500',
    headerClass: 'text-orange-700',
  },
  {
    value: 'questionnaire_sent',
    label: 'Questionário Enviado',
    dotClass: 'bg-purple-500',
    headerClass: 'text-purple-700',
  },
  {
    value: 'questionnaire_answered',
    label: 'Questionário Respondido',
    dotClass: 'bg-green-500',
    headerClass: 'text-green-700',
  },
]
