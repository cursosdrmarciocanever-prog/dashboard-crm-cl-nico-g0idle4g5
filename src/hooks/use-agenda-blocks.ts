import { useCallback, useEffect, useState } from 'react'
import { getAgendaBlocks, type AgendaBlock } from '@/services/agenda-blocks'
import { useRealtime } from '@/hooks/use-realtime'

/**
 * Bloqueios da agenda, sempre atualizados.
 *
 * Três telas diferentes precisam da mesma lista: o calendário para pintar e os
 * formulários para recusar. Fica no hook para nenhuma delas trabalhar com uma
 * cópia velha — se a secretária fecha a tarde enquanto o médico tem o
 * agendamento aberto, o formulário dele já recusa.
 */
export function useAgendaBlocks() {
  const [blocos, setBlocos] = useState<AgendaBlock[]>([])

  const recarregar = useCallback(async () => {
    try {
      setBlocos(await getAgendaBlocks())
    } catch {
      // Sem bloqueios carregados a agenda segue funcionando; o pior caso é
      // deixar marcar num dia fechado, e não travar o agendamento inteiro.
      setBlocos([])
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  useRealtime('agenda_blocks', recarregar)

  return { blocos, recarregar }
}
