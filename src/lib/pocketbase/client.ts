import PocketBase from 'pocketbase'
import { toast } from '@/hooks/use-toast'

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

export default pb
