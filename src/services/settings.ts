import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface ClinicSettings extends RecordModel {
  key: string
  clinic_name?: string
  clinic_whatsapp?: string
  welcome_message?: string
}

// Busca o registro unico de configuracao da clinica (key = 'clinic').
// Retorna null se a colecao ainda nao existir no backend (ex.: migration
// 0014 ainda nao aplicada), permitindo fallback para env/config.
export const getClinicSettings = async (): Promise<ClinicSettings | null> => {
  try {
    return await pb.collection<ClinicSettings>('settings').getFirstListItem("key='clinic'")
  } catch {
    return null
  }
}

export const updateClinicSettings = (id: string, data: Partial<ClinicSettings>) =>
  pb.collection<ClinicSettings>('settings').update(id, data)
