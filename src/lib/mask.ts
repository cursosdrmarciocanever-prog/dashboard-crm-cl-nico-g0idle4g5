/**
 * Disfarce dos dados de paciente no modo visitante.
 *
 * O objetivo é a demonstração continuar convincente — volume real, telas
 * cheias, nomes que parecem nomes — sem que a pessoa da tela seja
 * identificável por quem está olhando.
 *
 * O disfarce é determinístico: sai do próprio valor, então o mesmo paciente
 * aparece sempre igual em todas as telas. Se fosse aleatório, a mesma pessoa
 * teria um nome no calendário e outro na Jornada, e a demonstração pareceria
 * quebrada.
 */

/** 'Maria Aparecida da Silva' → 'Maria A.' */
export function mascararNome(nome: string): string {
  if (!nome) return nome
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0]

  // Preposições não servem como sobrenome: 'Maria da Silva' viraria 'Maria D.'
  const ignorar = ['da', 'de', 'do', 'das', 'dos', 'e']
  const sobrenomes = partes.slice(1).filter((p) => !ignorar.includes(p.toLowerCase()))
  const ultimo = sobrenomes[sobrenomes.length - 1]

  return ultimo ? `${partes[0]} ${ultimo[0].toUpperCase()}.` : partes[0]
}

/**
 * '(44) 99167-1203' → '(••) •••••-••03'
 *
 * Os dois últimos dígitos ficam para as linhas não virarem todas iguais na
 * tela. Dois dígitos sozinhos não identificam nem permitem ligar.
 */
export function mascararTelefone(telefone: string): string {
  if (!telefone) return telefone
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 4) return '(••) •••••-••••'
  return `(••) •••••-••${digitos.slice(-2)}`
}
