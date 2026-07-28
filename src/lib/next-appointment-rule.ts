import { differenceInCalendarDays } from 'date-fns'
import type { JourneyStage } from './journey-stages'

/**
 * Regra da clínica: depois que o paciente ENTRA no fluxo de consulta, ele deve
 * ter SEMPRE uma próxima consulta agendada. Ninguém sai do processo sem retorno
 * marcado.
 *
 * `novo_lead` é a única etapa de fora: ali a pessoa ainda é um contato, não
 * começou o processo.
 */
export const STAGES_FORA_DA_REGRA: JourneyStage[] = ['novo_lead']

export function exigeProximaConsulta(stage?: string): boolean {
  if (!stage) return false
  return !STAGES_FORA_DA_REGRA.includes(stage as JourneyStage)
}

export interface PendenciaAgendamento {
  /** Há quantos dias está sem próxima consulta (desde a última, ou desde o cadastro). */
  diasSemAgendamento: number | null
  /** Passou de 7 dias: a cobrança fica vermelha em vez de âmbar. */
  urgente: boolean
}

/**
 * Monta a pendência de um paciente que está no fluxo e não tem consulta futura.
 * Devolve null quando não há pendência (fora da regra ou já tem agendamento).
 */
export function calcularPendencia(
  stage: string | undefined,
  proximaConsulta: Date | undefined,
  ultimaConsulta: Date | undefined,
  cadastradoEm: string | undefined,
): PendenciaAgendamento | null {
  if (!exigeProximaConsulta(stage)) return null
  if (proximaConsulta) return null // tem retorno marcado: em dia

  const referencia = ultimaConsulta ?? (cadastradoEm ? new Date(cadastradoEm) : null)
  const dias = referencia ? differenceInCalendarDays(new Date(), referencia) : null

  return { diasSemAgendamento: dias, urgente: dias !== null && dias > 7 }
}
