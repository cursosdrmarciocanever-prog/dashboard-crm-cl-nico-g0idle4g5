import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface ClinicSettings extends RecordModel {
  key: string
  clinic_name?: string
  clinic_whatsapp?: string
  welcome_message?: string
  // Integração Meta Ads / Windsor.ai (configurável pela tela de Configurações)
  windsor_api_key?: string
  windsor_connector?: string
  windsor_account_id?: string
  windsor_date_preset?: string
  meta_sync_requested?: boolean
  meta_last_sync?: string
  meta_last_status?: string
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

// Solicita uma sincronização imediata do Meta Ads. O hook `meta_sync` (que roda
// a cada poucos minutos no PocketBase) detecta o flag, sincroniza e o limpa.
export const requestMetaSync = (id: string) =>
  pb.collection<ClinicSettings>('settings').update(id, { meta_sync_requested: true })
