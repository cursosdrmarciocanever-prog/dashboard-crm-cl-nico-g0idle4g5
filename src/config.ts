export const CLINIC_WHATSAPP_NUMBER = '5511999999999'

export const WHATSAPP_WELCOME_MESSAGE = 'Olá, gostaria de mais informações'

export const buildWhatsAppUrl = () =>
  `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_WELCOME_MESSAGE)}`
