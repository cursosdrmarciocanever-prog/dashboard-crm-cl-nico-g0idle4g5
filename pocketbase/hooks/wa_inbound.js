// Captura de leads e historico de conversa: recebe o webhook de mensagens do
// Evolution API. Endpoint: POST /api/wa-inbound?token=SECRET
//
// DUAS DIRECOES:
//   - Mensagem do paciente (fromMe = false): cria/atualiza o lead e grava como 'in'.
//   - Mensagem da clinica (fromMe = true): grava como 'out'. E o que a secretaria
//     digita no celular — sem isso o Inbox mostraria so metade da conversa.
//     Nao cria paciente: se o numero nao esta no CRM, a mensagem e ignorada (evita
//     virar paciente qualquer contato pessoal feito por esse WhatsApp).
//
// Config por variavel de ambiente: WA_WEBHOOK_TOKEN (segredo compartilhado).
// O Evolution deve ser configurado para chamar essa URL no evento MESSAGES_UPSERT.

routerAdd('POST', '/api/wa-inbound', (e) => {
  const token = $os.getenv('WA_WEBHOOK_TOKEN')
  const info = e.requestInfo()

  // Autenticacao simples por token na query string
  if (!token || (info.query && info.query.token) !== token) {
    return e.json(401, { error: 'unauthorized' })
  }

  const payload = info.body || {}
  const data = payload.data || null
  if (!data || !data.key) {
    return e.json(200, { ignored: 'sem data' })
  }

  const fromMe = !!data.key.fromMe
  const remoteJid = data.key.remoteJid || ''
  if (remoteJid.indexOf('@g.us') >= 0) return e.json(200, { ignored: 'grupo' })

  const phoneDigits = remoteJid.split('@')[0].replace(/\D/g, '')
  if (!phoneDigits) return e.json(200, { ignored: 'sem telefone' })

  const pushName = fromMe ? '' : data.pushName || ''
  let text = ''
  if (data.message) {
    text =
      data.message.conversation ||
      (data.message.extendedTextMessage && data.message.extendedTextMessage.text) ||
      ''
  }

  const now = new Date().toISOString().replace('T', ' ')
  const target = phoneDigits.replace(/^55/, '')

  // Procura paciente existente por telefone (comparacao flexivel: ignora DDI 55
  // e compara os ultimos digitos para tolerar formatos diferentes).
  let existing = null
  try {
    const candidates = $app.findRecordsByFilter('patients', "phone != ''", '-created', 1000, 0)
    for (const p of candidates) {
      const pd = ('' + p.getString('phone')).replace(/\D/g, '').replace(/^55/, '')
      if (pd && (pd === target || pd.slice(-8) === target.slice(-8))) {
        existing = p
        break
      }
    }
  } catch (err) {
    $app.logger().error('[wa_inbound] busca paciente falhou', 'error', err.message)
  }

  // Mensagem da clinica para um numero que nao esta no CRM: nada a registrar.
  if (fromMe && !existing) {
    return e.json(200, { ignored: 'fromMe sem paciente' })
  }

  let patientId = null
  let result = null
  try {
    if (existing) {
      existing.set('last_contact_date', now)
      $app.save(existing)
      patientId = existing.id
      result = { matched: existing.id }
    } else {
      const col = $app.findCollectionByNameOrId('patients')
      const rec = new Record(col)
      rec.set('name', pushName || 'Lead WhatsApp ' + phoneDigits.slice(-4))
      rec.set('phone', phoneDigits)
      rec.set('status', 'ativo')
      rec.set('journey_stage', 'novo_lead')
      rec.set('traffic_platform', 'whatsapp')
      rec.set('last_contact_date', now)
      $app.save(rec)
      patientId = rec.id
      result = { created: rec.id }
      $app.logger().info('[wa_inbound] lead criado', 'phone', phoneDigits, 'name', pushName)
    }
  } catch (err) {
    $app.logger().error('[wa_inbound] salvar lead falhou', 'error', err.message)
    return e.json(500, { error: 'save failed' })
  }

  // Grava a mensagem no historico (Inbox de Conversas)
  try {
    const waId = (data.key && data.key.id) || ''

    // O que o CRM envia volta pelo webhook como fromMe. Sem esta checagem a
    // mesma mensagem apareceria duas vezes no Inbox.
    if (fromMe && jaRegistrada(waId, phoneDigits, text)) {
      return e.json(200, { ignored: 'eco do proprio CRM' })
    }

    const msgCol = $app.findCollectionByNameOrId('messages')
    const msg = new Record(msgCol)
    msg.set('patient_id', patientId)
    msg.set('phone', phoneDigits)
    msg.set('direction', fromMe ? 'out' : 'in')
    msg.set('text', text || '[mídia/anexo]')
    msg.set('status', fromMe ? 'sent' : 'received')
    msg.set('wa_message_id', waId)
    $app.save(msg)
    if (fromMe) {
      $app.logger().info('[wa_inbound] mensagem da clinica registrada', 'phone', phoneDigits)
    }
  } catch (err) {
    $app.logger().error('[wa_inbound] gravar mensagem falhou', 'error', err.message)
  }

  // Ja existe essa mensagem de saida? Confere pelo id do WhatsApp e, se o id nao
  // veio na resposta do envio, pelo texto identico nos ultimos 2 minutos.
  function jaRegistrada(waId, phone, texto) {
    try {
      if (waId) {
        const porId = $app.findRecordsByFilter('messages', 'wa_message_id = {:wid}', '', 1, 0, {
          wid: waId,
        })
        if (porId.length) return true
      }
      if (!texto) return false
      const desde = new Date(Date.now() - 120000).toISOString().replace('T', ' ')
      const recentes = $app.findRecordsByFilter(
        'messages',
        "direction = 'out' && phone = {:p} && text = {:t} && created >= {:since}",
        '',
        1,
        0,
        { p: phone, t: texto, since: desde },
      )
      return recentes.length > 0
    } catch (err) {
      return false // em caso de duvida, registra: perder mensagem e pior que duplicar
    }
  }

  return e.json(200, result)
})
