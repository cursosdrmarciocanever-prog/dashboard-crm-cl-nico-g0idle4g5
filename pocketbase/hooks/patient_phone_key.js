// Impede cadastro duplicado pelo telefone.
//
// O CRM cria paciente por seis caminhos (cadastro manual, importação de leads,
// importação de implantes, dois botões de lead do WhatsApp e o webhook), cada um
// com uma checagem própria — ou nenhuma. Em vez de remendar os seis, a regra fica
// aqui: vale para todos, inclusive para quem criar pelo admin do PocketBase.
//
// Como funciona: cada paciente ganha um `phone_key` — o telefone reduzido à forma
// canônica (DDD + número, sem o 55, com o 9 do celular). É por ele que se compara,
// então (44) 98888-7777, 5544988887777 e 44 8888-7777 são o MESMO paciente.
// Um índice único no banco garante a regra mesmo se este hook falhar.
//
// OBS JSVM: handlers rodam em contexto isolado — a normalização fica inline em
// cada um. O mesmo cálculo existe em src/lib/phone.ts (phoneKey).

onRecordCreate((e) => {
  const rec = e.record

  const chave = (function calcular(raw) {
    let d = ('' + (raw || '')).replace(/\D/g, '')
    if (!d) return ''
    if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) d = d.slice(2)
    if (d.length === 11) return d
    if (d.length === 10) {
      const terceiro = d[2]
      if ('6789'.indexOf(terceiro) >= 0) return d.slice(0, 2) + '9' + d.slice(2)
      return d // fixo
    }
    return ''
  })(rec.getString('phone'))

  rec.set('phone_key', chave)

  // Sem telefone reconhecível não há como comparar — deixa passar.
  if (!chave) return e.next()

  const existentes = $app.findRecordsByFilter('patients', 'phone_key = {:k}', '', 1, 0, { k: chave })
  if (existentes.length) {
    const dono = existentes[0]
    const msg =
      'Já existe um paciente com esse telefone: ' +
      (dono.getString('name') || 'sem nome') +
      '. Abra o cadastro dele em vez de criar outro.'
    $app.logger().info('[patient_phone_key] duplicado barrado', 'phone_key', chave, 'existente', dono.id)
    try {
      throw new BadRequestError(msg, { patient_id: dono.id })
    } catch (err) {
      if (err instanceof ReferenceError) throw new Error(msg)
      throw err
    }
  }

  return e.next()
}, 'patients')

// Telefone editado depois do cadastro: mantém a chave em dia, senão a proteção
// se perde justamente em quem corrigiu o número.
onRecordUpdate((e) => {
  const rec = e.record

  const chave = (function calcular(raw) {
    let d = ('' + (raw || '')).replace(/\D/g, '')
    if (!d) return ''
    if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) d = d.slice(2)
    if (d.length === 11) return d
    if (d.length === 10) {
      const terceiro = d[2]
      if ('6789'.indexOf(terceiro) >= 0) return d.slice(0, 2) + '9' + d.slice(2)
      return d
    }
    return ''
  })(rec.getString('phone'))

  const atual = rec.getString('phone_key')

  // Duplicado antigo, marcado pela migration 0030 com sufixo (#2, #3): manter.
  // Recalcular jogaria a chave limpa e colidiria com o cadastro original.
  if (atual && chave && atual.indexOf(chave + '#') === 0) return e.next()

  if (atual !== chave) {
    rec.set('phone_key', chave)
  }

  return e.next()
}, 'patients')
