onRecordAfterCreateSuccess((e) => {
  const stage = e.record.getString('journey_stage')
  if (!stage) return e.next()

  try {
    const now = new Date().toISOString()
    const col = $app.findCollectionByNameOrId('patient_stage_history')
    const record = new Record(col)
    record.set('patient_id', e.record.id)
    record.set('stage', stage)
    record.set('entered_at', now)
    $app.save(record)
  } catch (err) {
    $app.logger().error('Failed to create stage history on patient create', 'error', err.message)
  }

  return e.next()
}, 'patients')
