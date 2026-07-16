export type JourneyStage =
  | 'novo_lead'
  | 'agendamento_confirmado'
  | 'exames_enviados'
  | 'exames_recebidos'
  | 'questionario_enviado'
  | 'questionario_respondido'

export interface JourneyStageConfig {
  value: JourneyStage
  label: string
  dotClass: string
  headerClass: string
}

export const JOURNEY_STAGES: JourneyStageConfig[] = [
  {
    value: 'novo_lead',
    label: 'Novo Lead',
    dotClass: 'bg-blue-500',
    headerClass: 'text-blue-700',
  },
  {
    value: 'agendamento_confirmado',
    label: 'Agendamento Confirmado',
    dotClass: 'bg-cyan-500',
    headerClass: 'text-cyan-700',
  },
  {
    value: 'exames_enviados',
    label: 'Exames Enviados',
    dotClass: 'bg-amber-500',
    headerClass: 'text-amber-700',
  },
  {
    value: 'exames_recebidos',
    label: 'Exames Recebidos',
    dotClass: 'bg-orange-500',
    headerClass: 'text-orange-700',
  },
  {
    value: 'questionario_enviado',
    label: 'Questionário Enviado',
    dotClass: 'bg-purple-500',
    headerClass: 'text-purple-700',
  },
  {
    value: 'questionario_respondido',
    label: 'Questionário Respondido',
    dotClass: 'bg-green-500',
    headerClass: 'text-green-700',
  },
]
