import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface StageTemplate extends RecordModel {
  stage: string
  message_text: string
  enabled: boolean
  delay_minutes: number
}

export const getStageTemplates = () =>
  pb.collection<StageTemplate>('stage_templates').getFullList({ sort: 'stage' })

export const updateStageTemplate = (id: string, data: Partial<StageTemplate>) =>
  pb.collection<StageTemplate>('stage_templates').update(id, data)
