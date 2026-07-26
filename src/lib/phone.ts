export type PhoneNote = 'ok' | 'add9' | 'fixo'

/**
 * Normalização de telefone brasileiro para o formato do WhatsApp (55+DDD+número).
 * - remove o DDI 55 quando claramente presente (12-13 dígitos)
 * - celular com 8 dígitos (antigo, sem o 9) → adiciona o 9
 * - fixo (10 dígitos começando com 2-5) → mantém
 * - exige DDD (número nacional com 10 ou 11 dígitos)
 */
export function normalizeBR(raw: string): { phone: string; valid: boolean; note: PhoneNote } {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return { phone: '', valid: false, note: 'ok' }

  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) {
    d = d.slice(2)
  }

  if (d.length === 11) {
    return { phone: '55' + d, valid: true, note: 'ok' }
  }
  if (d.length === 10) {
    const subFirst = d[2]
    if ('6789'.includes(subFirst)) {
      d = d.slice(0, 2) + '9' + d.slice(2)
      return { phone: '55' + d, valid: true, note: 'add9' }
    }
    return { phone: '55' + d, valid: true, note: 'fixo' }
  }
  return { phone: '', valid: false, note: 'ok' }
}

/** 5544988887777 -> +55 (44) 98888-7777 */
export function prettyPhone(p: string): string {
  if (p.length < 12) return p
  const cc = p.slice(0, 2)
  const ddd = p.slice(2, 4)
  const rest = p.slice(4)
  const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4)
  const end = rest.length === 9 ? rest.slice(5) : rest.slice(4)
  return `+${cc} (${ddd}) ${mid}-${end}`
}

/** Aceita DD/MM/AAAA, DD-MM-AAAA ou AAAA-MM-DD. Retorna Date válido ou null. */
export function parseDateBR(raw: string): Date | null {
  const s = (raw || '').trim()
  if (!s) return null
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const day = +m[1]
    const month = +m[2]
    let year = +m[3]
    if (year < 100) year += 2000
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return isNaN(d.getTime()) ? null : d
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
