onRecordAfterCreateSuccess((e) => {
  var stage = e.record.getString('journey_stage')

  if (!stage) {
    try {
      var patientRecord = $app.findRecordById('patients', e.record.id)
      patientRecord.set('journey_stage', 'novo_lead')
      if (!patientRecord.getString('status')) {
        patientRecord.set('status', 'ativo')
      }
      $app.save(patientRecord)
    } catch (err) {
      $app
        .logger()
        .error('Failed to set default journey stage on patient create', 'error', err.message)
    }
    return e.next()
  }

  try {
    var now = new Date().toISOString()
    var col = $app.findCollectionByNameOrId('patient_stage_history')
    var record = new Record(col)
    record.set('patient_id', e.record.id)
    record.set('stage', stage)
    record.set('entered_at', now)
    $app.save(record)
  } catch (err) {
    $app.logger().error('Failed to create stage history on patient create', 'error', err.message)
  }

  return e.next()
}, 'patients')
