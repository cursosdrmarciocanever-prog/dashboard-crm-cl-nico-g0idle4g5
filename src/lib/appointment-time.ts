/**
 * Consultas da clínica são marcadas de meia em meia hora (08:00, 08:30, 09:00...).
 *
 * A regra mora aqui, num lugar só, e vale para todas as telas que marcam ou
 * remarcam consulta. Já mudou uma vez — era de hora em hora — e mudar de novo
 * é trocar estas três linhas.
 *
 * Duas camadas, de propósito: o `step` faz o seletor do navegador andar de 30
 * em 30, e a checagem barra o que escapar. Nem todo navegador respeita o step,
 * e um 14:37 passando despercebido bagunça a agenda.
 */
export const PASSO_EM_SEGUNDOS = 30 * 60

/** Aceita só :00 e :30 — os minutos que a agenda da clínica usa. */
export function ehHorarioValido(valor: string): boolean {
  if (!valor) return false
  const d = new Date(valor)
  const min = d.getMinutes()
  return (min === 0 || min === 30) && d.getSeconds() === 0
}

export const AVISO_HORARIO_INVALIDO =
  'As consultas são marcadas de meia em meia hora — escolha um horário como 08:00 ou 08:30.'
