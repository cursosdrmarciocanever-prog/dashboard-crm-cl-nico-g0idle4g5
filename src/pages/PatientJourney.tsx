import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eye, EyeOff, CalendarX } from 'lucide-react'
import { getPatients, updatePatient, type Patient } from '@/services/patients'
import { getStageHistory, type PatientStageHistory } from '@/services/patient-stage-history'
import { getAppointments, type Appointment } from '@/services/appointments'
import { useRealtime } from '@/hooks/use-realtime'
import { JOURNEY_STAGES, type JourneyStage } from '@/lib/journey-stages'
import { stageToFlags } from '@/lib/journey-sync'
import { calculateStagnation, type StagnationInfo } from '@/lib/stagnation'
import {
  calcularPendencia,
  exigeProximaConsulta,
  type PendenciaAgendamento,
} from '@/lib/next-appointment-rule'
import { PatientJourneyCard, type CardAppointment } from '@/components/PatientJourneyCard'
import { PatientDetailPanel } from '@/components/PatientDetailPanel'
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Filtro = 'todos' | 'estagnados' | 'sem_agendamento'

export default function PatientJourney() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [history, setHistory] = useState<PatientStageHistory[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  // Cobranca de retorno: paciente que entrou no fluxo e ficou sem consulta futura
  const [cobranca, setCobranca] = useState<{ id: string; nome: string; etapa: string } | null>(null)

  const load = useCallback(async () => {
    const [patientData, historyData, appointmentData] = await Promise.all([
      getPatients(),
      getStageHistory(),
      getAppointments().catch(() => [] as Appointment[]),
    ])
    setPatients(patientData)
    setHistory(historyData)
    setAppointments(appointmentData)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime('patients', load)
  useRealtime('patient_stage_history', load)
  useRealtime('appointments', load)

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? null

  // Para cada paciente: a PROXIMA consulta agendada; se nao houver, a ULTIMA que
  // ja aconteceu. Canceladas nao contam. Uma consulta so para todos os cartoes.
  const appointmentMap = useMemo(() => {
    const now = new Date()
    const map = new Map<string, CardAppointment>()
    const sorted = appointments
      .filter((a) => a.status !== 'cancelled' && a.appointment_date)
      .sort(
        (a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime(),
      )
    for (const a of sorted) {
      const date = new Date(a.appointment_date)
      const current = map.get(a.patient_id)
      if (date >= now) {
        // primeira futura ganha; nunca sobrescreve uma futura ja registrada
        if (!current || current.kind === 'last') map.set(a.patient_id, { kind: 'next', date })
      } else if (!current || current.kind === 'last') {
        // passadas vem em ordem crescente: a ultima a entrar e a mais recente
        map.set(a.patient_id, { kind: 'last', date })
      }
    }
    return map
  }, [appointments])

  // Quem esta no fluxo e sem retorno marcado
  const pendenciaMap = useMemo(() => {
    const map = new Map<string, PendenciaAgendamento>()
    for (const p of patients) {
      const consulta = appointmentMap.get(p.id)
      const pendencia = calcularPendencia(
        p.journey_stage,
        consulta?.kind === 'next' ? consulta.date : undefined,
        consulta?.kind === 'last' ? consulta.date : undefined,
        p.created,
      )
      if (pendencia) map.set(p.id, pendencia)
    }
    return map
  }, [patients, appointmentMap])

  const semAgendamentoCount = pendenciaMap.size

  const stagnationMap = useMemo(() => {
    const map = new Map<string, StagnationInfo>()
    for (const patient of patients) {
      const info = calculateStagnation(history, patient.id)
      map.set(patient.id, info)
    }
    return map
  }, [patients, history])

  const stagnantCount = useMemo(
    () => Array.from(stagnationMap.values()).filter((s) => s.isStagnant).length,
    [stagnationMap],
  )

  const handleCardClick = (patient: Patient) => {
    setSelectedId(patient.id)
    setPanelOpen(true)
  }

  const handleDrop = async (stage: JourneyStage) => {
    setDragOverStage(null)
    if (!draggedId) return
    const patient = patients.find((p) => p.id === draggedId)
    setDraggedId(null)
    if (patient && patient.journey_stage !== stage) {
      const flags = stageToFlags(stage)
      await updatePatient(draggedId, { journey_stage: stage, ...flags })
      await load()

      // Regra da clinica: entrou no fluxo, tem que sair com retorno marcado.
      // Se a etapa exige e nao ha consulta futura, cobra na hora.
      const temFutura = appointmentMap.get(patient.id)?.kind === 'next'
      if (exigeProximaConsulta(stage) && !temFutura) {
        const etapa = JOURNEY_STAGES.find((s) => s.value === stage)?.label ?? ''
        setCobranca({ id: patient.id, nome: patient.name, etapa })
      }
    }
  }

  const filtrar = (lista: Patient[]) => {
    if (filtro === 'estagnados') return lista.filter((p) => stagnationMap.get(p.id)?.isStagnant)
    if (filtro === 'sem_agendamento') return lista.filter((p) => pendenciaMap.has(p.id))
    return lista
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Jornada do Paciente</h1>
          <p className="text-muted-foreground mt-1">
            Todo paciente no fluxo deve ter a próxima consulta agendada
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {stagnantCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <AlertTriangle className="w-3.5 h-3.5" />
              {stagnantCount} {stagnantCount === 1 ? 'estagnado' : 'estagnados'}
            </Badge>
          )}
          <Button
            variant={filtro === 'sem_agendamento' ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setFiltro((f) => (f === 'sem_agendamento' ? 'todos' : 'sem_agendamento'))
            }
            className={cn(
              'flex items-center gap-2',
              filtro !== 'sem_agendamento' &&
                semAgendamentoCount > 0 &&
                'border-amber-400 text-amber-700 dark:text-amber-400',
            )}
          >
            <CalendarX className="w-4 h-4" />
            Sem retorno agendado ({semAgendamentoCount})
          </Button>
          <Button
            variant={filtro === 'estagnados' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltro((f) => (f === 'estagnados' ? 'todos' : 'estagnados'))}
            className="flex items-center gap-2"
          >
            {filtro === 'estagnados' ? (
              <>
                <EyeOff className="w-4 h-4" />
                Ver todos
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Ver estagnados
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {JOURNEY_STAGES.map((stage) => {
          const stagePatients = patients.filter((p) => p.journey_stage === stage.value)
          const visiblePatients = filtrar(stagePatients)
          const stageStagnantCount = stagePatients.filter(
            (p) => stagnationMap.get(p.id)?.isStagnant,
          ).length
          const stageSemAgendamento = stagePatients.filter((p) => pendenciaMap.has(p.id)).length

          return (
            <div
              key={stage.value}
              className="flex-shrink-0 w-72 flex flex-col"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverStage(stage.value)
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={() => handleDrop(stage.value)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full', stage.dotClass)} />
                  <h3 className={cn('text-sm font-semibold', stage.headerClass)}>{stage.label}</h3>
                  {stageStagnantCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold"
                      title={`${stageStagnantCount} paciente(s) estagnado(s)`}
                    >
                      {stageStagnantCount}
                    </span>
                  )}
                  {stageSemAgendamento > 0 && (
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold"
                      title={`${stageSemAgendamento} sem retorno agendado`}
                    >
                      {stageSemAgendamento}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {visiblePatients.length}
                </span>
              </div>
              <div
                className={cn(
                  'flex-1 space-y-2 p-2 rounded-lg border transition-colors min-h-[200px]',
                  dragOverStage === stage.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/20',
                )}
              >
                {visiblePatients.map((patient) => (
                  <PatientJourneyCard
                    key={patient.id}
                    patient={patient}
                    stagnation={stagnationMap.get(patient.id)}
                    appointment={appointmentMap.get(patient.id)}
                    pendencia={pendenciaMap.get(patient.id)}
                    onClick={() => handleCardClick(patient)}
                    onDragStart={() => setDraggedId(patient.id)}
                    onDragEnd={() => {
                      setDraggedId(null)
                      setDragOverStage(null)
                    }}
                  />
                ))}
                {visiblePatients.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    {filtro === 'todos' ? 'Nenhum paciente' : 'Nenhum nesta situação'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Cobranca de retorno: abre ja com o paciente selecionado */}
      <NewAppointmentDialog
        open={!!cobranca}
        onOpenChange={(o) => !o && setCobranca(null)}
        patientId={cobranca?.id}
        hideTrigger
        notice={
          cobranca
            ? `${cobranca.nome} está em "${cobranca.etapa}" e não tem próxima consulta marcada. Agende o retorno agora — enquanto não agendar, o cartão fica sinalizado no quadro.`
            : undefined
        }
        onCreated={() => {
          setCobranca(null)
          load()
        }}
      />

      <PatientDetailPanel
        patient={selectedPatient}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onUpdated={load}
      />
    </div>
  )
}
