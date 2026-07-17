onRecordAfterUpdateSuccess((e) => {
  const oldStage = e.record.original().getString('journey_stage')
  const newStage = e.record.getString('journey_stage')

  if (oldStage === newStage) return e.next()
  if (!newStage) return e.next()

  const now = new Date().toISOString()

  try {
    const openRecords = $app.findRecordsByFilter(
      'patient_stage_history',
      "patient_id = '" + e.record.id + "' && exited_at = null",
      '-entered_at',
      1,
      0,
    )
    if (openRecords.length > 0) {
      const openRecord = openRecords[0]
      openRecord.set('exited_at', now)
      const enteredAtStr = openRecord.getString('entered_at')
      if (enteredAtStr) {
        const durationMs = new Date(now) - new Date(enteredAtStr)
        const durationHours = durationMs / (1000 * 60 * 60)
        openRecord.set('duration_hours', durationHours)
      }
      $app.save(openRecord)
    }
  } catch (err) {
    $app.logger().error('Failed to close stage history record', 'error', err.message)
  }

  try {
    const col = $app.findCollectionByNameOrId('patient_stage_history')
    const record = new Record(col)
    record.set('patient_id', e.record.id)
    record.set('stage', newStage)
    record.set('entered_at', now)
    $app.save(record)
  } catch (err) {
    $app.logger().error('Failed to create new stage history record', 'error', err.message)
  }

  return e.next()
}, 'patients')
