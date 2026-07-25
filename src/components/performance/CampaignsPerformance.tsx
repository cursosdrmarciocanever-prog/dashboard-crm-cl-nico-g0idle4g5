import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Bar,
  Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Wallet, Users, MousePointerClick, Percent, BarChart3, Megaphone, Info } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { getPatients, type Patient } from '@/services/patients'
import {
  getAdInsights,
  computeAccountTotals,
  computeCampaignTotals,
  computeDailySeries,
  computeCampaignReturns,
  formatBRL,
  formatInt,
  formatPct,
  type AdInsight,
} from '@/services/ad-insights'

const chartConfig = {
  spend: { label: 'Investido (R$/dia)', color: 'hsl(var(--primary))' },
  clicks: { label: 'Cliques', color: '#f97316' },
} satisfies ChartConfig

export function CampaignsPerformance() {
  const [insights, setInsights] = useState<AdInsight[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [ins, pts] = await Promise.all([getAdInsights(), getPatients()])
      setInsights(ins)
      setPatients(pts)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('ad_insights', () => load())
  useRealtime('patients', () => load())

  const totals = useMemo(() => computeAccountTotals(insights), [insights])
  const campaigns = useMemo(() => computeCampaignTotals(insights), [insights])
  const daily = useMemo(() => computeDailySeries(insights), [insights])
  const returns = useMemo(
    () => computeCampaignReturns(campaigns, patients),
    [campaigns, patients],
  )

  const chartData = useMemo(
    () =>
      daily.map((d) => ({
        ...d,
        label: format(new Date(d.date), 'dd/MM'),
      })),
    [daily],
  )

  if (!loading && insights.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-10 flex flex-col items-center text-center gap-3">
          <div className="bg-primary/10 p-4 rounded-full">
            <Megaphone className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold">Nenhum dado de campanha ainda</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Configure a integração com o Meta Ads em{' '}
            <span className="font-medium text-foreground">Configurações → Integração com Meta Ads</span>{' '}
            e clique em <span className="font-medium text-foreground">Sincronizar agora</span>. Os
            relatórios de investimento, cliques e custo por lead aparecerão aqui automaticamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  const kpis = [
    { label: 'Investido', value: formatBRL(totals.spend), foot: `${totals.activeDays} dias ativos`, icon: Wallet, tint: 'bg-primary/10 text-primary' },
    { label: 'Alcance', value: formatInt(totals.reach), foot: `${formatInt(totals.impressions)} impressões`, icon: Users, tint: 'bg-blue-100 text-blue-600' },
    { label: 'Cliques', value: formatInt(totals.clicks), foot: `CTR de ${formatPct(totals.ctr)}`, icon: MousePointerClick, tint: 'bg-emerald-100 text-emerald-600' },
    { label: 'CPC médio', value: formatBRL(totals.cpc), foot: 'custo por clique', icon: Percent, tint: 'bg-amber-100 text-amber-600' },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.label} className="hover:shadow-md transition-shadow border-none shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
                  <h3 className="text-3xl font-bold mt-2 tabular-nums">{k.value}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{k.foot}</p>
                </div>
                <div className={`p-4 rounded-full ${k.tint}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Investimento diário × cliques</h2>
          </div>
          <ChartContainer config={chartConfig} className="w-full h-[360px]">
            <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
              <YAxis
                yAxisId="spend"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                tickFormatter={(v: number) => `R$${Math.round(v)}`}
              />
              <YAxis
                yAxisId="clicks"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <Legend />
              <Bar
                yAxisId="spend"
                dataKey="spend"
                name="Investido (R$/dia)"
                fill="hsl(var(--primary))"
                radius={[5, 5, 0, 0]}
                maxBarSize={44}
              />
              <Line
                yAxisId="clicks"
                type="monotone"
                dataKey="clicks"
                name="Cliques"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Detalhamento por campanha</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">CPC</TableHead>
                  <TableHead className="text-right">Alcance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.campaign}>
                    <TableCell className="font-medium">{c.campaign}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(c.spend)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(c.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(c.clicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(c.ctr)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(c.cpc)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(c.reach)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Retorno real: do anúncio à consulta</h2>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-5">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Cruzamento automático: pacientes cuja origem (campo{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">campaign_name</code>) coincide
              com o nome da campanha. Consultas contam pacientes que já chegaram ao estágio de
              consulta realizada.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead className="text-right">Consultas</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                  <TableHead className="text-right">Custo/consulta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.campaign}>
                    <TableCell className="font-medium">{r.campaign}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(r.spend)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.cpl != null ? formatBRL(r.cpl) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.consultations}</TableCell>
                    <TableCell className="text-right">
                      {r.conversionRate != null ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 tabular-nums"
                        >
                          {formatPct(r.conversionRate)}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.costPerConsultation != null ? formatBRL(r.costPerConsultation) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {returns.every((r) => r.leads === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                      Nenhum paciente com origem de campanha preenchida ainda. Registre a campanha no
                      cadastro do paciente para ver o CPL e a conversão.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
