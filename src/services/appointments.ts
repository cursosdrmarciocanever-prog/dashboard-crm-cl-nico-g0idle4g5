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
