import PocketBase from 'pocketbase'
import { toast } from '@/hooks/use-toast'
import { mascararNome, mascararTelefone } from '@/lib/mask'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

/**
 * Modo visitante: navega por tudo, não muda nada.
 *
 * O bloqueio mora aqui, e não em cada botão, porque aqui passa TODA gravação do
 * app — as que existem hoje e as que eu escrever amanhã sem lembrar deste
 * recurso. Espalhar a checagem por dezenas de telas garantiria que uma delas
 * ficaria de fora, e seria justo a que o visitante clicaria.
 *
 * Isto é o aviso, não a proteção: o navegador é do visitante e ele pode chamar
 * a API por fora. Quem barra de verdade é a regra das coleções (migration 0035).
 */

/** Requisições que escrevem mas não são "alterar o CRM" — precisam passar. */
const SEMPRE_PERMITIDO = [
  '/api/realtime', // assinatura do tempo real é POST; sem ela a tela congela
  'auth-with-password',
  'auth-refresh',
  'auth-with-oauth2',
  'request-password-reset',
  'confirm-password-reset',
]

const ehLeitura = (metodo?: string) => {
  const m = (metodo || 'GET').toUpperCase()
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS'
}

export const ehVisitante = () =>
  pb.authStore.isValid && (pb.authStore.record as { role?: string } | null)?.role === 'visitante'

export const AVISO_VISITANTE = {
  title: 'FUNÇÃO VISITANTE ATIVADA',
  description: 'Você não tem acesso para realizar alterações nas funcionalidades.',
}

pb.beforeSend = (url, options) => {
  const liberado = SEMPRE_PERMITIDO.some((trecho) => url.includes(trecho))

  if (!liberado && !ehLeitura(options.method) && ehVisitante()) {
    toast({ ...AVISO_VISITANTE, variant: 'destructive' })
    // Aborta antes de sair do navegador. A tela que chamou cai no próprio catch
    // e mostra o erro dela; o aviso acima é o que o visitante lê primeiro.
    throw new Error('MODO_VISITANTE')
  }

  return { url, options }
}

/**
 * Disfarça nome e telefone de paciente enquanto o visitante navega.
 *
 * Fica no mesmo ponto da trava de escrita, e pelo mesmo motivo: toda resposta
 * da API passa por aqui. Trocar o texto em cada tela deixaria de fora
 * exatamente a que eu esquecesse.
 *
 * O que decide é o `collectionName` que o próprio PocketBase devolve em cada
 * registro — não o nome do campo. Sem isso, mascarar "name" também trocaria o
 * nome da clínica em Configurações e o do usuário no cabeçalho.
 */
const CAMPOS_POR_COLECAO: Record<string, string[]> = {
  patients: ['name', 'phone', 'phone_key'],
  messages: ['phone'],
  scheduled_messages: ['phone'],
}

function disfarcar(valor: unknown, profundidade = 0): void {
  // Respostas da API são JSON raso; o limite é só uma trava contra recursão
  // infinita se algum dia vier estrutura cíclica.
  if (profundidade > 8 || valor === null || typeof valor !== 'object') return

  if (Array.isArray(valor)) {
    valor.forEach((item) => disfarcar(item, profundidade + 1))
    return
  }

  const obj = valor as Record<string, unknown>
  const campos = CAMPOS_POR_COLECAO[obj.collectionName as string]
  if (campos) {
    for (const campo of campos) {
      if (typeof obj[campo] !== 'string' || !obj[campo]) continue
      obj[campo] = campo === 'name' ? mascararNome(obj[campo] as string) : mascararTelefone(obj[campo] as string)
    }
  }

  // Segue por dentro: `items` da lista, `expand.patient_id` das relações.
  Object.values(obj).forEach((v) => disfarcar(v, profundidade + 1))
}

pb.afterSend = (_response, data) => {
  if (ehVisitante()) disfarcar(data)
  return data
}

export default pb
