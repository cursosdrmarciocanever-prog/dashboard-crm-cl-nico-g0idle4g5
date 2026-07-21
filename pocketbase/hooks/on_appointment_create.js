onRecordAfterCreateSuccess((e) => {
  var patientId = e.record.getString('patient_id')
  if (!patientId) return e.next()

  try {
    var patient = $app.findRecordById('patients', patientId)
    var currentStage = patient.getString('journey_stage')

    if (currentStage !== 'agendamento_confirmado') {
      patient.set('journey_stage', 'agendamento_confirmado')
      if (!patient.getString('status')) {
        patient.set('status', 'ativo')
      }
      $app.save(patient)
    }
  } catch (err) {
    $app
      .logger()
      .error('Failed to update patient stage on appointment create', 'error', err.message)
  }

  return e.next()
}, 'appointments')
