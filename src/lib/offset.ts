/**
 * Prazo das automações: quanto antes (ou depois) de uma data a mensagem sai.
 *
 * Cada automação guarda o prazo numa unidade diferente no banco — lembrete de
 * consulta em horas, lembrete de implante em dias, follow-up de estágio em
 * minutos. Para a tela ser a mesma nas três, tudo é convertido para MINUTOS
 * ASSINADOS aqui: negativo = antes da data, positivo = depois, zero = na hora.
 */

export type Unidade = 'minutos' | 'horas' | 'dias'
export type Sentido = 'antes' | 'depois'

export const MINUTOS_POR: Record<Unidade, number> = {
  minutos: 1,
  horas: 60,
  dias: 1440,
}

/** Da maior para a menor — usada para escolher como exibir um prazo. */
const PREFERENCIA: Unidade[] = ['dias', 'horas', 'minutos']

export interface Prazo {
  /** Sempre positivo; o lado fica em `sentido`. */
  quantidade: number
  unidade: Unidade
  sentido: Sentido
}

/**
 * Minutos assinados → prazo legível, na maior unidade permitida que couber
 * exata: 4320 min viram "3 dias", 120 min viram "2 horas".
 */
export function decompor(minutos: number, permitidas: Unidade[] = PREFERENCIA): Prazo {
  const ordem = PREFERENCIA.filter((u) => permitidas.includes(u))
  const usaveis = ordem.length ? ordem : (['minutos'] as Unidade[])

  const sentido: Sentido = minutos < 0 ? 'antes' : 'depois'
  const abs = Math.abs(minutos)

  for (const u of usaveis) {
    if (abs % MINUTOS_POR[u] === 0) {
      return { quantidade: abs / MINUTOS_POR[u], unidade: u, sentido }
    }
  }

  // Não divide exato em nenhuma unidade permitida: arredonda na menor delas.
  const menor = usaveis[usaveis.length - 1]
  return { quantidade: Math.round(abs / MINUTOS_POR[menor]), unidade: menor, sentido }
}

/** Prazo → minutos assinados. */
export function compor(p: Prazo): number {
  const m = Math.abs(p.quantidade) * MINUTOS_POR[p.unidade]
  return p.sentido === 'antes' ? -m : m
}

const SINGULAR: Record<Unidade, string> = {
  minutos: 'minuto',
  horas: 'hora',
  dias: 'dia',
}

/** "3 dias", "1 hora", "45 minutos" */
export function nomearQuantidade(quantidade: number, unidade: Unidade): string {
  return `${quantidade} ${quantidade === 1 ? SINGULAR[unidade] : unidade}`
}

/**
 * Frase inteira, para o usuário conferir o que configurou sem fazer conta:
 * descrever(-4320, { zero: 'no horário da consulta', antes: 'antes da consulta',
 * depois: 'depois da consulta' }) → "3 dias antes da consulta".
 */
export function descrever(
  minutos: number,
  ancora: { zero: string; antes: string; depois: string },
  permitidas: Unidade[] = PREFERENCIA,
): string {
  if (!minutos) return ancora.zero
  const p = decompor(minutos, permitidas)
  if (!p.quantidade) return ancora.zero
  return `${nomearQuantidade(p.quantidade, p.unidade)} ${p.sentido === 'antes' ? ancora.antes : ancora.depois}`
}
