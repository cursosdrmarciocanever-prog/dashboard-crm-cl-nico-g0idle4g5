// Envio de mensagens de saida do Inbox: quando o CRM cria uma `messages` com
// direction='out' e status='queued', envia via Evolution API e atualiza o status.
// A chave do Evolution fica so no servidor (nunca exposta ao front).

onRecordAfterCreateSuccess((e) => {
  const rec = e.record
  if (rec.getString('direction') !== 'out' || rec.getString('status') !== 'queued') {
    return e.next()
  }

  const evoUrl = $os.getenv('EVOLUTION_URL')
  const evoKey = $os.getenv('EVOLUTION_API_KEY')
  const instance = $os.getenv('EVOLUTION_INSTANCE')

  if (!evoUrl || !evoKey || !instance) {
    rec.set('status', 'failed')
    rec.set('error_detail', 'integracao WhatsApp nao configurada')
    $app.save(rec)
    return e.next()
  }

  try {
    let phone = rec.getString('phone')
    if (!phone) {
      const patient = $app.findRecordById('patients', rec.getString('patient_id'))
      phone = patient.getString('phone')
    }
    phone = waNormalizePhone(phone)

    const res = $http.send({
      url: evoUrl + '/message/sendText/' + instance,
      method: 'POST',
      headers: { apikey: evoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text: rec.getString('text') }),
      timeout: 20,
    })

    // Log de diagnostico (temporario): mostra o que o Evolution respondeu.
    let respBody = ''
    try {
      respBody = res.json ? JSON.stringify(res.json) : '' + res.body
    } catch (_) {
      respBody = '(corpo ilegivel)'
    }
    $app
      .logger()
      .info('[wa_send] evolution', 'status', res.statusCode, 'phone', phone, 'body', String(respBody).substring(0, 400))

    if (res.statusCode >= 200 && res.statusCode < 300) {
      rec.set('status', 'sent')
      try {
        const j = res.json
        if (j && j.key && j.key.id) rec.set('wa_message_id', j.key.id)
      } catch (_) {
        // sem id na resposta — tudo bem
      }
    } else {
      rec.set('status', 'failed')
      rec.set('error_detail', 'HTTP ' + res.statusCode)
    }
    $app.save(rec)
  } catch (err) {
    try {
      rec.set('status', 'failed')
      rec.set('error_detail', String(err.message).substring(0, 200))
      $app.save(rec)
    } catch (e2) {
      // ignora
    }
    $app.logger().error('[wa_send] envio falhou', 'id', rec.id, 'error', err.message)
  }

  return e.next()
}, 'messages')

// Normaliza telefone BR para o formato do WhatsApp (DDI+DDD+numero, so digitos).
function waNormalizePhone(raw) {
  if (!raw) return ''
  let d = ('' + raw).replace(/\D/g, '')
  if (!d) return ''
  if (d.length <= 11) d = '55' + d
  return d
}
