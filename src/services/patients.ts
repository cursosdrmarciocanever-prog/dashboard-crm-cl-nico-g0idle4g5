import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { JourneyStage } from '@/lib/journey-stages'
import { phoneKey } from '@/lib/phone'

export interface Patient extends RecordModel {
  name: string
  phone: string
  /** Telefone canônico (DDD+número). Mantido pelo servidor — não editar pelo app. */
  phone_key?: string
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

/**
 * Procura paciente pelo telefone usando a chave canônica — (44) 98888-7777 e
 * 5544988887777 encontram o mesmo cadastro. A consulta é feita no servidor, por
 * índice: antes isso baixava a base inteira para comparar no navegador.
 */
export const findPatientByPhone = async (phone: string): Promise<Patient | null> => {
  const key = phoneKey(phone)
  if (!key) return null
  const found = await pb
    .collection<Patient>('patients')
    .getList(1, 1, { filter: pb.filter('phone_key = {:k}', { k: key }) })
  return found.items[0] ?? null
}

export const createPatient = (data: Partial<Patient>) =>
  pb.collection<Patient>('patients').create(data)

export const updatePatient = (id: string, data: Partial<Patient>) =>
  pb.collection<Patient>('patients').update(id, data)

export const deletePatient = (id: string) => pb.collection<Patient>('patients').delete(id)
