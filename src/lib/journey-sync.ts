import type { JourneyStage } from '@/lib/journey-stages'

export type ChecklistFlag =
  | 'exams_sent_flag'
  | 'exams_received_flag'
  | 'anamnesis_sent_flag'
  | 'questionnaire_answered_flag'

export const FLAG_TO_STAGE: Record<ChecklistFlag, JourneyStage> = {
  exams_sent_flag: 'exames_enviados',
  exams_received_flag: 'exames_recebidos',
  anamnesis_sent_flag: 'questionario_enviado',
  questionnaire_answered_flag: 'questionario_respondido',
}

export function stageToFlags(stage: JourneyStage): Partial<Record<ChecklistFlag, boolean>> {
  switch (stage) {
    case 'exames_enviados':
      return { exams_sent_flag: true }
    case 'exames_recebidos':
      return { exams_received_flag: true, exams_sent_flag: true }
    case 'questionario_enviado':
      return { anamnesis_sent_flag: true }
    case 'questionario_respondido':
      return { questionnaire_answered_flag: true, anamnesis_sent_flag: true }
    default:
      return {}
  }
}
