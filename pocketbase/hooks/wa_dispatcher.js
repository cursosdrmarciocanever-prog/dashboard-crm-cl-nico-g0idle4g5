// Disparador de mensagens agendadas (WhatsApp via Evolution API).
// A cada minuto: pega as scheduled_messages 'pending' cuja hora chegou e envia.
// Throttle (BATCH por minuto) reduz risco de banimento.
//
// Config por variaveis de ambiente (passadas ao container do PocketBase):
//   EVOLUTION_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE

cronAdd('wa_dispatcher', '* * * * *', () => {
  const evoUrl = $os.getenv('EVOLUTION_URL')
  const evoKey = $os.getenv('EVOLUTION_API_KEY')
  const instance = $os.getenv('EVOLUTION_INSTANCE')
  if (!evoUrl || !evoKey || !instance) {
    return // integracao ainda nao configurada
  }

  const BATCH = 10 // no maximo 10 envios por minuto (anti-banimento)
  const now = new Date().toISOString().replace('T', ' ') // formato datetime do PocketBase

  let due = []
  try {
    due = $app.findRecordsByFilter(
      'scheduled_messages',
      "status = 'pending' && scheduled_at != '' && scheduled_at <= {:now}",
      'scheduled_at',
      BATCH,
      0,
      { now: now },
    )
  } catch (err) {
    $app.logger().error('[wa_dispatcher] busca falhou', 'error', err.message)
    return
  }

  for (const msg of due) {
    try {
      const patient = $app.findRecordById('patients', msg.getString('patient_id'))
      const phone = waNormalizePhone(patient.getString('phone'))

      if (!phone) {
        msg.set('status', 'failed')
        msg.set('error_detail', 'telefone invalido')
        $app.save(msg)
        continue
      }

      const res = $http.send({
        url: evoUrl + '/message/sendText/' + instance,
        method: 'POST',
        headers: { apikey: evoKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone, text: msg.getString('message_text') }),
        timeout: 20,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        msg.set('status', 'sent')
        msg.set('sent_at', now)
        msg.set('error_detail', '')
      } else {
        msg.set('status', 'failed')
        msg.set('error_detail', 'HTTP ' + res.statusCode)
      }
      $app.save(msg)
    } catch (err) {
      try {
        msg.set('status', 'failed')
        msg.set('error_detail', String(err.message).substring(0, 200))
        $app.save(msg)
      } catch (e2) {
        // ignora falha ao salvar o erro
      }
      $app.logger().error('[wa_dispatcher] envio falhou', 'id', msg.id, 'error', err.message)
    }
  }
})

// Normaliza telefone BR para o formato do WhatsApp (DDI+DDD+numero, so digitos).
function waNormalizePhone(raw) {
  if (!raw) return ''
  let d = ('' + raw).replace(/\D/g, '')
  if (!d) return ''
  if (d.length <= 11) d = '55' + d // sem DDI -> assume Brasil
  return d
}
