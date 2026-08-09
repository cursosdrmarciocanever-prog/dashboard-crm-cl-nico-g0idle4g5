import { differenceInCalendarDays, format } from 'date-fns'

/**
 * Monta o texto do lembrete de implante trocando {nome} e {data}.
 *
 * O mesmo cálculo roda no servidor, no hook implant_reminders.js, para os envios
 * automáticos. Aqui é para o envio MANUAL, que precisa mostrar o texto já pronto
 * na tela antes de disparar — ninguém deve mandar mensagem para uma paciente sem
 * ver antes o que vai sair.
 */
export function montarMensagemImplante(
  template: string,
  dados: { nome: string; vencimento?: string },
): string {
  const nome = (dados.nome || '').trim()
  const primeiro = nome.split(' ')[0] || nome
  const data = dados.vencimento ? format(new Date(dados.vencimento), 'dd/MM/yyyy') : ''
  return (template || '').split('{nome}').join(primeiro).split('{data}').join(data)
}

/** O template usa a data de vencimento? Se usa e não há data, o texto sairia furado. */
export const usaData = (template: string) => (template || '').includes('{data}')

/**
 * Escolhe o lembrete mais adequado para hoje: o que estiver mais perto da
 * distância atual até o vencimento. Faltando 28 dias, sugere o de 30 dias antes;
 * vencido, sugere o do dia do vencimento. É só uma sugestão — dá para trocar.
 */
export function lembreteSugerido<T extends { offset_days?: number }>(
  templates: T[],
  vencimento?: string,
): T | undefined {
  if (!templates.length) return undefined
  if (!vencimento) return templates[0]

  const atual = differenceInCalendarDays(new Date(), new Date(vencimento))
  return templates.reduce((melhor, t) => {
    const d = Math.abs((t.offset_days ?? 0) - atual)
    const dMelhor = Math.abs((melhor.offset_days ?? 0) - atual)
    return d < dMelhor ? t : melhor
  })
}
