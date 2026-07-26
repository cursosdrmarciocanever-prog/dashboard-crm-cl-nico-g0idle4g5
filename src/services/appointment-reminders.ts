import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface AppointmentReminder extends RecordModel {
  label: string
  message_text: string
  offset_hours: number
  enabled: boolean
}

export const getAppointmentReminders = () =>
  pb.collection<AppointmentReminder>('appointment_reminders').getFullList({ sort: 'offset_hours' })

export const updateAppointmentReminder = (id: string, data: Partial<AppointmentReminder>) =>
  pb.collection<AppointmentReminder>('appointment_reminders').update(id, data)
