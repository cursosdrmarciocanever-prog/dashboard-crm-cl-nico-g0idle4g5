export const CLINIC_WHATSAPP_NUMBER = '5511999999999'

export const WHATSAPP_WELCOME_MESSAGE =
  'Olá! Vim pelo site da clínica e gostaria de mais informações.'

export const buildWhatsAppUrl = (number?: string, message?: string) =>
  `https://wa.me/${number ?? CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message ?? WHATSAPP_WELCOME_MESSAGE)}`
