export type JourneyStage =
  | 'novo_lead'
  | 'agendamento_confirmado'
  | 'exames_enviados'
  | 'exames_recebidos_parcialmente'
  | 'exames_recebidos_completos'
  | 'exames_enviados_dr_marcio'
  | 'exames_recebidos_dr_marcio_vistos'
  | 'exames_anexados'
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
    value: 'exames_recebidos_parcialmente',
    label: 'Exames Recebidos Parcialmente',
    dotClass: 'bg-orange-500',
    headerClass: 'text-orange-700',
  },
  {
    value: 'exames_recebidos_completos',
    label: 'Exames Recebidos Completos',
    dotClass: 'bg-orange-600',
    headerClass: 'text-orange-800',
  },
  {
    value: 'exames_enviados_dr_marcio',
    label: 'Exames Enviados para o Dr. Márcio',
    dotClass: 'bg-indigo-500',
    headerClass: 'text-indigo-700',
  },
  {
    value: 'exames_recebidos_dr_marcio_vistos',
    label: 'Exames Recebidos do Dr. Márcio e Vistos',
    dotClass: 'bg-violet-500',
    headerClass: 'text-violet-700',
  },
  {
    value: 'exames_anexados',
    label: 'Exames Anexados',
    dotClass: 'bg-teal-500',
    headerClass: 'text-teal-700',
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
