import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { Patient } from './patients'

export interface ImplantReminder extends RecordModel {
  label: string
  message_text: string
  offset_days: number
  kind: 'schedule' | 'return'
  only_if_no_return: boolean
  enabled: boolean
}

// Pacientes com implante ativo, ordenadas pelo vencimento mais próximo.
export const getImplantPatients = () =>
  pb.collection<Patient>('patients').getFullList({
    filter: 'implant_active = true',
    sort: 'implant_expires_at',
  })

// Define/atualiza os dados do implante (o hook calcula o vencimento e agenda).
export const setImplant = (
  patientId: string,
  placedAt: string,
  durationMonths: number,
) =>
  pb.collection<Patient>('patients').update(patientId, {
    implant_active: true,
    implant_placed_at: placedAt,
    implant_duration_months: durationMonths,
    implant_returned_at: null,
  })

// Marca o retorno: cancela os lembretes pendentes e dispara a lista de exames.
export const markImplantReturn = (patientId: string) =>
  pb.collection<Patient>('patients').update(patientId, {
    implant_returned_at: new Date().toISOString(),
  })

// Remove a paciente do acompanhamento de implantes.
export const removeImplant = (patientId: string) =>
  pb.collection<Patient>('patients').update(patientId, { implant_active: false })

export const getImplantReminders = () =>
  pb.collection<ImplantReminder>('implant_reminders').getFullList({ sort: 'offset_days' })

export const updateImplantReminder = (id: string, data: Partial<ImplantReminder>) =>
  pb.collection<ImplantReminder>('implant_reminders').update(id, data)
