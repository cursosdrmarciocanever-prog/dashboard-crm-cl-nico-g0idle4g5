import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { Patient } from './patients'

export interface Appointment extends RecordModel {
  patient_id: string
  appointment_date: string
  notes: string
  status: 'scheduled' | 'completed' | 'cancelled'
  expand?: { patient_id: Patient }
}

export const getAppointments = (filter?: string) =>
  pb
    .collection<Appointment>('appointments')
    .getFullList({ filter, sort: 'appointment_date', expand: 'patient_id' })

export const createAppointment = (data: Partial<Appointment>) =>
  pb.collection<Appointment>('appointments').create(data)

export const updateAppointment = (id: string, data: Partial<Appointment>) =>
  pb.collection<Appointment>('appointments').update(id, data)

/**
 * Apaga a consulta de vez — para lançamento errado ou duplicado, não para
 * consulta desmarcada (essa é "cancelar", que preserva o registro).
 *
 * Os lembretes de WhatsApp ainda não enviados vão junto: o campo appointment_id
 * em scheduled_messages é uma relação com cascadeDelete, então o próprio banco
 * remove a fila. Sem isso a paciente receberia "sua consulta é amanhã" de uma
 * consulta que não existe mais.
 */
export const deleteAppointment = (id: string) =>
  pb.collection<Appointment>('appointments').delete(id)

// Todas as consultas de um paciente (qualquer status), da mais recente para a mais antiga.
export const getPatientAppointments = (patientId: string) =>
  pb.collection<Appointment>('appointments').getFullList({
    filter: pb.filter('patient_id = {:id}', { id: patientId }),
    sort: '-appointment_date',
  })
