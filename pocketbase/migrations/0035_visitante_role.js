// Papel 'visitante': navega por tudo, nao muda nada.
//
// Para demonstrar o CRM a quem tem interesse em investir sem entregar o poder
// de mexer em paciente, automacao ou configuracao.
//
// A trava que vale e esta, na regra da colecao. O aviso na tela existe para
// explicar, nao para proteger: quem abre o console do navegador fala direto com
// a API, e ai so a regra do servidor segura.
//
// A regra e ADICIONADA a que ja existe, nunca substitui — a 0027 negou a
// secretaria em varias colecoes e trocar a expressao apagaria aquilo. Regra
// nula fica nula: no PocketBase isso ja significa "so superusuario".
//
// A colecao `users` entra na lista pelo motivo menos obvio e mais grave: sem
// isso o visitante edita o proprio cadastro e troca o papel para admin.
const NEGA_VISITANTE = '@request.auth.role != "visitante"'

const COLECOES = [
  'patients',
  'appointments',
  'scheduled_messages',
  'messages',
  'patient_stage_history',
  'settings',
  'stage_templates',
  'appointment_reminders',
  'implant_reminders',
  'prescription_requests',
  'agenda_blocks',
  '_pb_users_auth_',
]

/** Junta a nova condicao a regra existente, preservando o que ja havia. */
function somar(regra) {
  if (regra === null) return null // ja trancada
  if (regra === '') return NEGA_VISITANTE // era aberta a todos
  if (regra.indexOf('visitante') !== -1) return regra // ja tem a trava
  return '(' + regra + ') && ' + NEGA_VISITANTE
}

migrate(
  (app) => {
    // 1. 'visitante' precisa existir na lista do campo, senao o proprio
    //    PocketBase recusa salvar o usuario com esse papel.
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const campo = users.fields.getByName('role')
    if (campo && campo.values.indexOf('visitante') === -1) {
      campo.values = ['admin', 'secretaria', 'visitante']
      app.save(users)
    }

    // 2. Nega escrita em todas as colecoes do CRM.
    for (const nome of COLECOES) {
      try {
        const col = app.findCollectionByNameOrId(nome)
        col.createRule = somar(col.createRule)
        col.updateRule = somar(col.updateRule)
        col.deleteRule = somar(col.deleteRule)
        app.save(col)
      } catch (e) {
        // colecao ainda nao existe nesta base — segue
      }
    }
  },
  (app) => {
    // Desfazer: tira so o pedaco que esta migration acrescentou.
    const limpar = (regra) => {
      if (!regra) return regra
      return regra
        .replace(' && ' + NEGA_VISITANTE, '')
        .replace(/^\((.*)\)$/, '$1')
    }

    for (const nome of COLECOES) {
      try {
        const col = app.findCollectionByNameOrId(nome)
        col.createRule = limpar(col.createRule)
        col.updateRule = limpar(col.updateRule)
        col.deleteRule = limpar(col.deleteRule)
        app.save(col)
      } catch (e) {
        // ignora
      }
    }

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const campo = users.fields.getByName('role')
    if (campo) {
      campo.values = ['admin', 'secretaria']
      app.save(users)
    }
  },
)
