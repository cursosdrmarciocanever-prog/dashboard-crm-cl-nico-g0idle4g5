import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { Patient } from './patients'

export interface AdInsight extends RecordModel {
  platform: string
  account_id: string
  campaign: string
  ad_set?: string
  ad_name?: string
  date: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  cpc: number
  cpm: number
  ctr: number
}

export interface CampaignTotals {
  campaign: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  cpc: number
  ctr: number
}

export interface DailyPoint {
  date: string
  spend: number
  clicks: number
  impressions: number
  reach: number
}

export interface AccountTotals {
  spend: number
  impressions: number
  clicks: number
  reach: number
  cpc: number
  cpm: number
  ctr: number
  activeDays: number
}

// Cruzamento campanha x CRM: custo por lead e conversao lead -> consulta.
export interface CampaignReturn {
  campaign: string
  spend: number
  leads: number
  consultations: number
  cpl: number | null
  costPerConsultation: number | null
  conversionRate: number | null
}

// Estagio que marca a consulta efetivamente realizada (para conversao).
const CONSULTATION_STAGES = new Set([
  'consulta_realizada',
  'novo_pedido_exames_fornecido',
  'proxima_consulta_agendada',
])

export const getAdInsights = (filter?: string) =>
  pb.collection<AdInsight>('ad_insights').getFullList({ filter, sort: 'date' })

export function computeAccountTotals(insights: AdInsight[]): AccountTotals {
  const spend = sum(insights, 'spend')
  const impressions = sum(insights, 'impressions')
  const clicks = sum(insights, 'clicks')
  const reach = sum(insights, 'reach')
  const activeDays = new Set(insights.map((i) => i.date?.substring(0, 10))).size
  return {
    spend,
    impressions,
    clicks,
    reach,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? clicks / impressions : 0,
    activeDays,
  }
}

export function computeCampaignTotals(insights: AdInsight[]): CampaignTotals[] {
  const byCampaign = new Map<string, AdInsight[]>()
  for (const row of insights) {
    const list = byCampaign.get(row.campaign) ?? []
    list.push(row)
    byCampaign.set(row.campaign, list)
  }

  return Array.from(byCampaign.entries())
    .map(([campaign, rows]) => {
      const spend = sum(rows, 'spend')
      const impressions = sum(rows, 'impressions')
      const clicks = sum(rows, 'clicks')
      return {
        campaign,
        spend,
        impressions,
        clicks,
        reach: sum(rows, 'reach'),
        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: impressions > 0 ? clicks / impressions : 0,
      }
    })
    .sort((a, b) => b.spend - a.spend)
}

export function computeDailySeries(insights: AdInsight[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>()
  for (const row of insights) {
    const day = row.date?.substring(0, 10)
    if (!day) continue
    const point = byDate.get(day) ?? { date: day, spend: 0, clicks: 0, impressions: 0, reach: 0 }
    point.spend += row.spend || 0
    point.clicks += row.clicks || 0
    point.impressions += row.impressions || 0
    point.reach += row.reach || 0
    byDate.set(day, point)
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// Cruza o gasto de cada campanha com os pacientes cuja origem (`campaign_name`)
// bate com o nome da campanha, revelando CPL e conversao lead -> consulta.
export function computeCampaignReturns(
  campaigns: CampaignTotals[],
  patients: Patient[],
): CampaignReturn[] {
  return campaigns.map((c) => {
    const leadsList = patients.filter(
      (p) => (p.campaign_name || '').trim() === c.campaign.trim(),
    )
    const leads = leadsList.length
    const consultations = leadsList.filter(
      (p) => p.journey_stage && CONSULTATION_STAGES.has(p.journey_stage),
    ).length
    return {
      campaign: c.campaign,
      spend: c.spend,
      leads,
      consultations,
      cpl: leads > 0 ? c.spend / leads : null,
      costPerConsultation: consultations > 0 ? c.spend / consultations : null,
      conversionRate: leads > 0 ? consultations / leads : null,
    }
  })
}

function sum<T>(rows: T[], key: keyof T): number {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)
}

// --- Formatadores (pt-BR) ---

export const formatBRL = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatInt = (value: number): string =>
  Math.round(value).toLocaleString('pt-BR')

export const formatPct = (ratio: number): string =>
  `${(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
