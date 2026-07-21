import { JOURNEY_STAGES, type JourneyStage } from '@/lib/journey-stages'

export interface ChecklistItem {
  stage: JourneyStage
  label: string
}

export const POST_CONSULTATION_CHECKLIST: ChecklistItem[] = [
  { stage: 'consulta_realizada', label: 'Consulta Realizada' },
  { stage: 'novo_pedido_exames_fornecido', label: 'Novo Pedido de Exames' },
  { stage: 'proxima_consulta_agendada', label: 'Próxima Consulta Agendada' },
]

export type ChecklistStatus = 'completed' | 'active' | 'pending'

export function getChecklistStatus(
  patientStage: JourneyStage | undefined,
  itemStage: JourneyStage,
): ChecklistStatus {
  if (!patientStage) return 'pending'
  if (patientStage === itemStage) return 'active'
  const patientIdx = JOURNEY_STAGES.findIndex((s) => s.value === patientStage)
  const itemIdx = JOURNEY_STAGES.findIndex((s) => s.value === itemStage)
  if (patientIdx === -1 || itemIdx === -1) return 'pending'
  return patientIdx > itemIdx ? 'completed' : 'pending'
}
