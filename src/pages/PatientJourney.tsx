import { useCallback, useEffect, useState } from 'react'
import { getPatients, updatePatient, type Patient } from '@/services/patients'
import { useRealtime } from '@/hooks/use-realtime'
import { JOURNEY_STAGES, type JourneyStage } from '@/lib/journey-stages'
import { stageToFlags } from '@/lib/journey-sync'
import { PatientJourneyCard } from '@/components/PatientJourneyCard'
import { PatientDetailPanel } from '@/components/PatientDetailPanel'
import { cn } from '@/lib/utils'

export default function PatientJourney() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await getPatients()
    setPatients(data)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime('patients', load)

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? null

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Jornada do Paciente</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o progresso dos pacientes pelo funil de atendimento
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {JOURNEY_STAGES.map((stage) => {
          const stagePatients = patients.filter((p) => p.journey_stage === stage.value)
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
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {stagePatients.length}
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
                {stagePatients.map((patient) => (
                  <PatientJourneyCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => handleCardClick(patient)}
                    onDragStart={() => setDraggedId(patient.id)}
                    onDragEnd={() => {
                      setDraggedId(null)
                      setDragOverStage(null)
                    }}
                  />
                ))}
                {stagePatients.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    Nenhum paciente
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
