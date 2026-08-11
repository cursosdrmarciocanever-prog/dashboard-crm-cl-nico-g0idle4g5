/**
 * Regras dos bloqueios de agenda.
 *
 * Mora aqui, num lugar só, porque a mesma conta responde três perguntas que
 * precisam concordar: o calendário pinta o dia, o formulário recusa o
 * agendamento e o aviso explica por quê. Se cada tela fizesse a sua conta, uma
 * mostraria bloqueado enquanto outra deixaria marcar.
 */
import { format } from 'date-fns'
import type { AgendaBlock } from '@/services/agenda-blocks'

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const fimDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

/**
 * Os dois extremos entram no bloqueio.
 *
 * Bloquear "das 14:00 às 16:00" deixando as 16:00 livre seria a leitura mais
 * literal, mas não é o que se quer dizer ao fechar a tarde — e o erro dessa
 * escolha (uma consulta marcada num horário que se queria fechado) é pior do
 * que o oposto.
 */
const dentro = (quando: Date, bloco: AgendaBlock) => {
  const t = quando.getTime()
  return t >= new Date(bloco.starts_at).getTime() && t <= new Date(bloco.ends_at).getTime()
}

/** O bloqueio encosta em algum instante deste dia? */
export function bloqueiosDoDia(blocos: AgendaBlock[], dia: Date): AgendaBlock[] {
  const de = inicioDoDia(dia).getTime()
  const ate = fimDoDia(dia).getTime()
  return blocos.filter(
    (b) => new Date(b.starts_at).getTime() <= ate && new Date(b.ends_at).getTime() >= de,
  )
}

/** O bloqueio que cobre este instante exato, ou null. */
export function bloqueioNoInstante(blocos: AgendaBlock[], quando: Date): AgendaBlock | null {
  return blocos.find((b) => dentro(quando, b)) ?? null
}

/** O dia inteiro está fechado (não só uma faixa dele)? */
export function diaTodoBloqueado(blocos: AgendaBlock[], dia: Date): boolean {
  return bloqueiosDoDia(blocos, dia).some((b) => b.all_day)
}

/**
 * Como o bloqueio aparece na célula do calendário.
 *
 * Um bloqueio de dia inteiro que atravessa vários dias mostra "Dia todo" em
 * cada um — repetir a data do intervalo em toda célula só ocuparia espaço.
 */
export function rotuloDoBloqueio(bloco: AgendaBlock): string {
  if (bloco.all_day) return 'Dia todo'
  const de = format(new Date(bloco.starts_at), 'HH:mm')
  const ate = format(new Date(bloco.ends_at), 'HH:mm')
  return `${de} às ${ate}`
}

/** Frase inteira, para o aviso de recusa e para a lista de bloqueios. */
export function descreverBloqueio(bloco: AgendaBlock): string {
  const inicio = new Date(bloco.starts_at)
  const fim = new Date(bloco.ends_at)

  if (!bloco.all_day) {
    return `${format(inicio, 'dd/MM')}, das ${format(inicio, 'HH:mm')} às ${format(fim, 'HH:mm')}`
  }
  const mesmoDia = format(inicio, 'yyyy-MM-dd') === format(fim, 'yyyy-MM-dd')
  return mesmoDia
    ? `${format(inicio, 'dd/MM')}, dia todo`
    : `de ${format(inicio, 'dd/MM')} a ${format(fim, 'dd/MM')}, dia todo`
}

/** Mensagem mostrada quando alguém tenta marcar em cima de um bloqueio. */
export function avisoDeBloqueio(bloco: AgendaBlock): string {
  const quando = descreverBloqueio(bloco)
  return bloco.reason
    ? `A agenda está bloqueada (${quando}) — ${bloco.reason}.`
    : `A agenda está bloqueada (${quando}).`
}
