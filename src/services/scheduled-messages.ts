import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { Patient } from './patients'

export interface ScheduledMessage extends RecordModel {
  patient_id: string
  message_text: string
  scheduled_at: string
  status: 'pending' | 'sent' | 'cancelled'
  expand?: { patient_id: Patient }
}

export const getScheduledMessages = (filter?: string) =>
  pb.collection<ScheduledMessage>('scheduled_messages').getFullList({
    filter,
    sort: 'scheduled_at',
    expand: 'patient_id',
  })

export const createScheduledMessage = (data: Partial<ScheduledMessage>) =>
  pb.collection<ScheduledMessage>('scheduled_messages').create(data)

export const updateScheduledMessage = (id: string, data: Partial<ScheduledMessage>) =>
  pb.collection<ScheduledMessage>('scheduled_messages').update(id, data)

export const deleteScheduledMessage = (id: string) =>
  pb.collection<ScheduledMessage>('scheduled_messages').delete(id)

// Mensagens agendadas de um paciente, das mais próximas para as mais antigas.
export const getPatientScheduledMessages = (patientId: string) =>
  pb.collection<ScheduledMessage>('scheduled_messages').getFullList({
    filter: pb.filter('patient_id = {:id}', { id: patientId }),
    sort: '-scheduled_at',
  })
