import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { JourneyStage } from '@/lib/journey-stages'

export interface Patient extends RecordModel {
  name: string
  phone: string
  last_visit: string
  status: 'ativo' | 'concluido' | 'inativo'
  doctor_id: string
  journey_stage?: JourneyStage
  last_contact_date?: string
  exams_sent_flag?: boolean
  exams_received_flag?: boolean
  anamnesis_sent_flag?: boolean
  questionnaire_answered_flag?: boolean
  traffic_platform?: string
  campaign_name?: string
  ad_set_name?: string
  ad_name?: string
}

export const getPatients = (filter?: string) =>
  pb.collection<Patient>('patients').getFullList({ filter, sort: '-created' })

export const getPatient = (id: string) => pb.collection<Patient>('patients').getOne(id)

export const createPatient = (data: Partial<Patient>) =>
  pb.collection<Patient>('patients').create(data)

export const updatePatient = (id: string, data: Partial<Patient>) =>
  pb.collection<Patient>('patients').update(id, data)

export const deletePatient = (id: string) => pb.collection<Patient>('patients').delete(id)
