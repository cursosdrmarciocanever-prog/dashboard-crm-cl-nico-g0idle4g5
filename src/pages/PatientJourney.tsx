import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { getPatients, updatePatient, type Patient } from '@/services/patients'
import { getStageHistory, type PatientStageHistory } from '@/services/patient-stage-history'
import { useRealtime } from '@/hooks/use-realtime'
import { JOURNEY_STAGES, type JourneyStage } from '@/lib/journey-stages'
import { stageToFlags } from '@/lib/journey-sync'
import { calculateStagnation, type StagnationInfo } from '@/lib/stagnation'
import { PatientJourneyCard } from '@/components/PatientJourneyCard'
import { PatientDetailPanel } from '@/components/PatientDetailPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function PatientJourney() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [history, setHistory] = useState<PatientStageHistory[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [showStagnantOnly, setShowStagnantOnly] = useState(false)

  const load = useCallback(async () => {
    const [patientData, historyData] = await Promise.all([getPatients(), getStageHistory()])
    setPatients(patientData)
    setHistory(historyData)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime('patients', load)
  useRealtime('patient_stage_history', load)

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? null

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
      load()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Jornada do Paciente</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o progresso dos pacientes pelo funil de atendimento
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stagnantCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <AlertTriangle className="w-3.5 h-3.5" />
              {stagnantCount} {stagnantCount === 1 ? 'estagnado' : 'estagnados'}
            </Badge>
          )}
          <Button
            variant={showStagnantOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowStagnantOnly((v) => !v)}
            className="flex items-center gap-2"
          >
            {showStagnantOnly ? (
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
          const visiblePatients = showStagnantOnly
            ? stagePatients.filter((p) => stagnationMap.get(p.id)?.isStagnant)
            : stagePatients
          const stageStagnantCount = stagePatients.filter(
            (p) => stagnationMap.get(p.id)?.isStagnant,
          ).length

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
                    {showStagnantOnly ? 'Nenhum estagnado' : 'Nenhum paciente'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <PatientDetailPanel
        patient={selectedPatient}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onUpdated={load}
      />
    </div>
  )
}
