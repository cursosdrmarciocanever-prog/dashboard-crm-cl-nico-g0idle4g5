/**
 * Quando a clínica atende.
 *
 * De segunda a sexta. Manhã das 07:00 às 11:30 e tarde das 13:30 às 18:00, de
 * meia em meia hora. O intervalo do meio-dia (12:00, 12:30 e 13:00) não é
 * oferecido.
 *
 * A grade mora aqui, num lugar só, e vale para todas as telas que marcam ou
 * remarcam consulta. Mudar o horário de atendimento é mexer nas constantes
 * abaixo — não em cada tela.
 */

/** Início e fim de cada turno, em minutos desde a meia-noite. */
const TURNOS = [
  { rotulo: 'Manhã', de: 7 * 60, ate: 11 * 60 + 30 },
  { rotulo: 'Tarde', de: 13 * 60 + 30, ate: 18 * 60 },
]

const PASSO_EM_MINUTOS = 30

const doisDigitos = (n: number) => ('0' + n).slice(-2)
const paraHHMM = (minutos: number) =>
  `${doisDigitos(Math.floor(minutos / 60))}:${doisDigitos(minutos % 60)}`

/** Os turnos com seus horários, para a lista aparecer separada na tela. */
export const TURNOS_DE_ATENDIMENTO = TURNOS.map((t) => {
  const horarios: string[] = []
  for (let m = t.de; m <= t.ate; m += PASSO_EM_MINUTOS) horarios.push(paraHHMM(m))
  return { rotulo: t.rotulo, horarios }
})

/** Todos os horários válidos, em ordem: 07:00, 07:30, ..., 11:30, 13:30, ..., 18:00. */
export const HORARIOS_DISPONIVEIS = TURNOS_DE_ATENDIMENTO.flatMap((t) => t.horarios)

/** Sábado e domingo: a clínica não atende. */
export const ehFimDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6

/**
 * 'AAAA-MM-DD' vindo do campo de data → Date ao meio-dia local.
 *
 * `new Date('2026-08-15')` é meia-noite em UTC, que no Brasil ainda é dia 14 —
 * e aí um sábado passa por sexta. O meio-dia mantém o dia certo.
 */
export const diaParaData = (dia: string) => new Date(`${dia}T12:00:00`)

export const AVISO_FIM_DE_SEMANA =
  'A clínica atende de segunda a sexta. Escolha um dia útil.'

const AVISO_HORARIO_INVALIDO =
  'A clínica atende das 07:00 às 11:30 e das 13:30 às 18:00, de meia em meia hora. Escolha um horário da lista.'

/**
 * O agendamento cai num dia e horário que a clínica atende?
 *
 * Devolve a mensagem do problema, ou null quando está tudo certo — assim cada
 * tela diz o que de fato está errado em vez de um aviso genérico.
 *
 * A checagem continua existindo mesmo com a lista fechada e o fim de semana
 * escondido: os seletores impedem o erro comum, mas o que chega ao banco vem da
 * API, e um sábado às 12:15 salvo por outro caminho bagunçaria a agenda igual.
 */
export function validarAgendamento(valor: string): string | null {
  if (!valor) return 'Escolha a data e o horário da consulta.'
  const d = new Date(valor)
  if (isNaN(d.getTime())) return 'Data inválida.'
  if (ehFimDeSemana(d)) return AVISO_FIM_DE_SEMANA
  const hhmm = `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
  return HORARIOS_DISPONIVEIS.includes(hhmm) ? null : AVISO_HORARIO_INVALIDO
}
