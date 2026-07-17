import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { JOURNEY_STAGES, type JourneyStage } from '@/lib/journey-stages'

export interface StageHistoryRecord extends RecordModel {
  patient_id: string
  stage: JourneyStage
  entered_at: string
  exited_at: string
  duration_hours: number
}

export interface StageAverage {
  stage: JourneyStage
  label: string
  averageHours: number
  count: number
}

export const getStageHistory = () =>
  pb.collection<StageHistoryRecord>('patient_stage_history').getFullList({ sort: 'entered_at' })

export function computeStageAverages(history: StageHistoryRecord[]): StageAverage[] {
  const stageData: Record<string, number[]> = {}

  for (const record of history) {
    if (record.duration_hours != null && record.duration_hours > 0) {
      if (!stageData[record.stage]) stageData[record.stage] = []
      stageData[record.stage].push(record.duration_hours)
    }
  }

  return JOURNEY_STAGES.map((config) => {
    const durations = stageData[config.value] || []
    const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
    return {
      stage: config.value,
      label: config.label,
      averageHours: Math.round(avg * 10) / 10,
      count: durations.length,
    }
  })
}

export function computeTotalJourneyTime(averages: StageAverage[]): number {
  return Math.round(averages.reduce((sum, a) => sum + a.averageHours, 0) * 10) / 10
}

export function findBottleneck(averages: StageAverage[]): StageAverage | null {
  const withData = averages.filter((a) => a.averageHours > 0)
  if (withData.length === 0) return null
  return withData.reduce((max, curr) => (curr.averageHours > max.averageHours ? curr : max))
}

export function formatDuration(hours: number): string {
  if (hours === 0) return '0h'
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return days % 1 === 0 ? `${days}d` : `${days.toFixed(1)}d`
}

export function formatHoursAsTicks(hours: number): string {
  if (hours === 0) return '0'
  if (hours < 24) return `${Math.round(hours)}h`
  const days = hours / 24
  return days % 1 === 0 ? `${days}d` : `${days.toFixed(1)}d`
}
