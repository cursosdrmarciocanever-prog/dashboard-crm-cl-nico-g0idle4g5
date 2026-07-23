// Fallbacks estaticos. O valor oficial em runtime vem da colecao `settings`
// do PocketBase (editavel em Configuracoes), com este env/constante como rede
// de seguranca caso a colecao ainda nao exista.
export const CLINIC_WHATSAPP_NUMBER =
  (import.meta.env.VITE_CLINIC_WHATSAPP as string | undefined) ?? '5544999999999'

export const WHATSAPP_WELCOME_MESSAGE =
  'Olá! Vim pelo site da clínica e gostaria de mais informações.'

export const buildWhatsAppUrl = (number?: string, message?: string) =>
  `https://wa.me/${number ?? CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message ?? WHATSAPP_WELCOME_MESSAGE)}`
