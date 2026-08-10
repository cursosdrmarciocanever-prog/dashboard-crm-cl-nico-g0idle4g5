import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { Patient } from './patients'

export type PrescriptionStatus = 'pending' | 'approved' | 'rejected'

export interface PrescriptionRequest extends RecordModel {
  patient_id: string
  medication: string
  last_visit_at?: string
  next_visit_at?: string
  status: PrescriptionStatus
  requested_by?: string
  decided_by?: string
  decided_at?: string
  decision_note?: string
  expand?: { patient_id: Patient }
}

/** Pendentes primeiro; dentro de cada grupo, o mais recente no topo. */
export const getPrescriptionRequests = () =>
  pb.collection<PrescriptionRequest>('prescription_requests').getFullList({
    sort: '-created',
    expand: 'patient_id',
  })

export const createPrescriptionRequest = (data: {
  patient_id: string
  medication: string
  last_visit_at?: string
  next_visit_at?: string
  requested_by?: string
}) =>
  pb.collection<PrescriptionRequest>('prescription_requests').create({
    ...data,
    status: 'pending' as PrescriptionStatus,
  })

/**
 * Aprova ou reprova. Só o médico consegue: `updateRule` da coleção nega a
 * secretaria (migration 0033), então esconder o botão na tela é conveniência,
 * não a proteção.
 */
export const decidePrescriptionRequest = (
  id: string,
  status: Extract<PrescriptionStatus, 'approved' | 'rejected'>,
  decidedBy: string,
  note?: string,
) =>
  pb.collection<PrescriptionRequest>('prescription_requests').update(id, {
    status,
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
    decision_note: note ?? '',
  })
