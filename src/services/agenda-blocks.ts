import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface AgendaBlock extends RecordModel {
  /** Instante inicial (inclusive). */
  starts_at: string
  /** Instante final (inclusive). */
  ends_at: string
  /** Só muda como o bloqueio é mostrado; a conta usa sempre o intervalo. */
  all_day: boolean
  reason: string
  created_by: string
}

export const getAgendaBlocks = () =>
  pb.collection<AgendaBlock>('agenda_blocks').getFullList({ sort: 'starts_at' })

export const createAgendaBlock = (data: Partial<AgendaBlock>) =>
  pb.collection<AgendaBlock>('agenda_blocks').create(data)

export const deleteAgendaBlock = (id: string) =>
  pb.collection<AgendaBlock>('agenda_blocks').delete(id)
