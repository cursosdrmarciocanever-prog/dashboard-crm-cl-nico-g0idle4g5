migrate(
  (app) => {
    if (app.countRecords('patient_stage_history') > 0) return

    const col = app.findCollectionByNameOrId('patient_stage_history')

    const stages = [
      'novo_lead',
      'agendamento_confirmado',
      'exames_enviados',
      'exames_recebidos',
      'questionario_enviado',
      'questionario_respondido',
    ]

    const allPatients = app.findRecordsByFilter('patients', "id != ''", 'created', 0, 0)
    if (allPatients.length === 0) return

    const baseDurations = [12, 24, 72, 24, 24, 6]
    const variations = [1, 0.5, 1.5, 0.8, 1.2, 0.7, 1.3, 0.6]

    for (let i = 0; i < allPatients.length; i++) {
      const patient = allPatients[i]
      const currentStage = patient.getString('journey_stage')
      const currentStageIndex = stages.indexOf(currentStage)
      if (currentStageIndex === -1) continue

      const variation = variations[i % variations.length]
      const currentTime = new Date()
      currentTime.setDate(currentTime.getDate() - 30)

      for (let j = 0; j <= currentStageIndex; j++) {
        const record = new Record(col)
        record.set('patient_id', patient.id)
        record.set('stage', stages[j])

        const enteredAt = new Date(currentTime)
        record.set('entered_at', enteredAt.toISOString())

        if (j < currentStageIndex) {
          const durationHours = Math.round(baseDurations[j] * variation)
          currentTime.setHours(currentTime.getHours() + durationHours)
          const exitedAt = new Date(currentTime)
          record.set('exited_at', exitedAt.toISOString())
          record.set('duration_hours', durationHours)
        }

        app.save(record)
      }
    }
  },
  (app) => {},
)
