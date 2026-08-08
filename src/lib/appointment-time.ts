/**
 * Consultas da clínica são marcadas de hora em hora (08:00, 09:00, ...).
 * O `step` abaixo faz o seletor do navegador andar de 60 em 60 minutos; a
 * checagem existe porque nem todo navegador respeita o step, e um horário
 * quebrado passando despercebido bagunçaria a agenda.
 */
export const PASSO_HORA_EM_SEGUNDOS = 3600

/** true quando o horário cai exatamente na hora cheia. */
export function ehHoraCheia(valor: string): boolean {
  if (!valor) return false
  const d = new Date(valor)
  return d.getMinutes() === 0 && d.getSeconds() === 0
}

export const AVISO_HORA_CHEIA =
  'As consultas são marcadas de hora em hora — escolha um horário fechado, como 08:00 ou 14:00.'
