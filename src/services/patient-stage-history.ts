import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { JourneyStage } from '@/lib/journey-stages'

export interface PatientStageHistory extends RecordModel {
  patient_id: string
  stage: JourneyStage
  entered_at: string
  exited_at?: string
  duration_hours?: number
}

export const getStageHistory = (filter?: string) =>
  pb.collection<PatientStageHistory>('patient_stage_history').getFullList({
    filter,
    sort: '-entered_at',
  })

export const getLatestStageHistory = (patientId: string) =>
  pb
    .collection<PatientStageHistory>('patient_stage_history')
    .getFirstListItem(`patient_id = "${patientId}" && exited_at = null`, { sort: '-entered_at' })

export const createStageHistory = (data: Partial<PatientStageHistory>) =>
  pb.collection<PatientStageHistory>('patient_stage_history').create(data)

export const updateStageHistory = (id: string, data: Partial<PatientStageHistory>) =>
  pb.collection<PatientStageHistory>('patient_stage_history').update(id, data)
