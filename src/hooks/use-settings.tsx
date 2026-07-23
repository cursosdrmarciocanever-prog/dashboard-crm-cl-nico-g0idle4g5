import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { getClinicSettings, type ClinicSettings } from '@/services/settings'
import { CLINIC_WHATSAPP_NUMBER, WHATSAPP_WELCOME_MESSAGE } from '@/config'

interface SettingsContextType {
  settings: ClinicSettings | null
  /** Numero de WhatsApp efetivo (settings do backend com fallback para env/config). */
  clinicWhatsapp: string
  /** Mensagem de boas-vindas efetiva. */
  welcomeMessage: string
  loading: boolean
  reload: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within a SettingsProvider')
  return context
}

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const data = await getClinicSettings()
    setSettings(data)
  }, [])

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  const clinicWhatsapp = settings?.clinic_whatsapp?.trim() || CLINIC_WHATSAPP_NUMBER
  const welcomeMessage = settings?.welcome_message?.trim() || WHATSAPP_WELCOME_MESSAGE

  return (
    <SettingsContext.Provider
      value={{ settings, clinicWhatsapp, welcomeMessage, loading, reload }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
