import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { Patient } from './patients'

export interface Message extends RecordModel {
  patient_id: string
  phone?: string
  direction: 'in' | 'out'
  text: string
  status: 'received' | 'queued' | 'sent' | 'failed'
  wa_message_id?: string
  error_detail?: string
  expand?: { patient_id: Patient }
}

// Mensagens recentes (para montar a lista de conversas), com o paciente expandido.
export const getRecentMessages = (limit = 300) =>
  pb.collection<Message>('messages').getList(1, limit, {
    sort: '-created',
    expand: 'patient_id',
  })

// Histórico completo de um paciente, em ordem cronológica.
export const getConversation = (patientId: string) =>
  pb.collection<Message>('messages').getFullList({
    filter: `patient_id = "${patientId}"`,
    sort: 'created',
  })

// Cria uma mensagem de saída; o hook wa_send envia no WhatsApp e atualiza o status.
export const sendMessage = (patientId: string, phone: string, text: string) =>
  pb.collection<Message>('messages').create({
    patient_id: patientId,
    phone,
    direction: 'out',
    text,
    status: 'queued',
  })
