// Captura de leads: recebe o webhook de mensagens do Evolution API e cria/atualiza
// o lead no CRM automaticamente. Endpoint: POST /api/wa-inbound?token=SECRET
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

  // Ignora mensagens enviadas por nos mesmos e mensagens de grupo
  if (data.key.fromMe) return e.json(200, { ignored: 'fromMe' })
  const remoteJid = data.key.remoteJid || ''
  if (remoteJid.indexOf('@g.us') >= 0) return e.json(200, { ignored: 'grupo' })

  const phoneDigits = remoteJid.split('@')[0].replace(/\D/g, '')
  if (!phoneDigits) return e.json(200, { ignored: 'sem telefone' })

  const pushName = data.pushName || ''
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

  // Grava a mensagem recebida no historico (Inbox de Conversas)
  try {
    const msgCol = $app.findCollectionByNameOrId('messages')
    const msg = new Record(msgCol)
    msg.set('patient_id', patientId)
    msg.set('phone', phoneDigits)
    msg.set('direction', 'in')
    msg.set('text', text || '[mídia/anexo]')
    msg.set('status', 'received')
    msg.set('wa_message_id', (data.key && data.key.id) || '')
    $app.save(msg)
  } catch (err) {
    $app.logger().error('[wa_inbound] gravar mensagem falhou', 'error', err.message)
  }

  return e.json(200, result)
})
