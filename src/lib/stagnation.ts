import type { PatientStageHistory } from '@/services/patient-stage-history'

export const STAGNATION_THRESHOLD_HOURS = 72

export interface StagnationInfo {
  isStagnant: boolean
  hoursInStage: number
  displayLabel: string
}

export function calculateStagnation(
  historyRecords: PatientStageHistory[],
  patientId: string | undefined,
): StagnationInfo {
  if (!patientId) {
    return { isStagnant: false, hoursInStage: 0, displayLabel: '' }
  }

  const latestRecord = historyRecords
    .filter((r) => r.patient_id === patientId)
    .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime())[0]

  if (!latestRecord?.entered_at) {
    return { isStagnant: false, hoursInStage: 0, displayLabel: '' }
  }

  const enteredAt = new Date(latestRecord.entered_at).getTime()
  const now = Date.now()
  const diffMs = now - enteredAt
  const hoursInStage = Math.floor(diffMs / (1000 * 60 * 60))

  const isStagnant = hoursInStage > STAGNATION_THRESHOLD_HOURS

  let displayLabel = ''
  if (isStagnant) {
    if (hoursInStage >= 24) {
      const days = Math.floor(hoursInStage / 24)
      const remainingHours = hoursInStage % 24
      displayLabel =
        remainingHours > 0
          ? `${days}d ${remainingHours}h em estagnação`
          : `${days} dias em estagnação`
    } else {
      displayLabel = `${hoursInStage}h em estagnação`
    }
  }

  return { isStagnant, hoursInStage, displayLabel }
}

export function formatDurationLabel(hours: number): string {
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} dias`
  }
  return `${hours}h`
}
