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
  imported?: boolean
  implant_active?: boolean
  implant_placed_at?: string
  implant_duration_months?: number
  implant_expires_at?: string
  implant_returned_at?: string
}

export const getPatients = (filter?: string) =>
  pb.collection<Patient>('patients').getFullList({ filter, sort: '-created' })

// Lista paginada (para muitos registros). Busca por nome ou telefone no servidor.
export const listPatients = (page: number, perPage: number, search?: string) => {
  const q = (search || '').trim()
  const filter = q ? pb.filter('name ~ {:q} || phone ~ {:q}', { q }) : ''
  return pb.collection<Patient>('patients').getList(page, perPage, { filter, sort: '-created' })
}

export const getPatient = (id: string) => pb.collection<Patient>('patients').getOne(id)

export const findPatientByPhone = async (phone: string): Promise<Patient | null> => {
  const normalized = phone.replace(/\D/g, '')
  if (!normalized) return null
  const all = await pb.collection<Patient>('patients').getFullList()
  return all.find((p) => p.phone && p.phone.replace(/\D/g, '') === normalized) ?? null
}

export const createPatient = (data: Partial<Patient>) =>
  pb.collection<Patient>('patients').create(data)

export const updatePatient = (id: string, data: Partial<Patient>) =>
  pb.collection<Patient>('patients').update(id, data)

export const deletePatient = (id: string) => pb.collection<Patient>('patients').delete(id)
