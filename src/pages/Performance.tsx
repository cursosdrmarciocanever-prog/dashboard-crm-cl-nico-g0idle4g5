import { useEffect, useState, useMemo, useCallback } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Clock, AlertTriangle, Users, TrendingUp } from 'lucide-react'
import {
  getStageHistory,
  computeStageAverages,
  computeTotalJourneyTime,
  findBottleneck,
  formatDuration,
  formatHoursAsTicks,
  type StageHistoryRecord,
} from '@/services/stage-history'
import { useRealtime } from '@/hooks/use-realtime'
import { JOURNEY_STAGES } from '@/lib/journey-stages'

const chartConfig = {
  averageHours: {
    label: 'Tempo Médio (horas)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

export default function Performance() {
  const [history, setHistory] = useState<StageHistoryRecord[]>([])

  const load = useCallback(async () => {
    try {
      const data = await getStageHistory()
      setHistory(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('patient_stage_history', () => load())
  useRealtime('patients', () => load())

  const averages = useMemo(() => computeStageAverages(history), [history])
  const totalTime = useMemo(() => computeTotalJourneyTime(averages), [averages])
  const bottleneck = useMemo(() => findBottleneck(averages), [averages])
  const trackedPatients = useMemo(() => new Set(history.map((h) => h.patient_id)).size, [history])

  const chartData = useMemo(
    () =>
      averages.map((a) => ({
        ...a,
        isBottleneck: bottleneck?.stage === a.stage && a.averageHours > 0,
        displayLabel: a.label.length > 15 ? a.label.substring(0, 12) + '…' : a.label,
      })),
    [averages, bottleneck],
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Performance</h1>
        <p className="text-muted-foreground mt-1">
          Análise de tempo médio por etapa da jornada do paciente
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tempo Total Médio</p>
              <h3 className="text-3xl font-bold mt-2">{formatDuration(totalTime)}</h3>
              <p className="text-xs text-muted-foreground mt-1">Lead → Questionário Respondido</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-full">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gargalo Identificado</p>
              <h3 className="text-xl font-bold mt-2">
                {bottleneck ? bottleneck.label : 'Sem dados'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {bottleneck ? `${formatDuration(bottleneck.averageHours)} em média` : '—'}
              </p>
            </div>
            <div className="bg-orange-100 p-4 rounded-full">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pacientes Rastreados</p>
              <h3 className="text-3xl font-bold mt-2">{trackedPatients}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {history.length} transições registradas
              </p>
            </div>
            <div className="bg-blue-100 p-4 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Tempo Médio por Etapa</h2>
          </div>
          <ChartContainer config={chartConfig} className="w-full h-[400px]">
            <BarChart data={chartData} margin={{ top: 20, right: 16, bottom: 60, left: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="displayLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                angle={-25}
                textAnchor="end"
                interval={0}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatHoursAsTicks}
                fontSize={12}
              />
              <Bar dataKey="averageHours" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.stage}
                    fill={entry.isBottleneck ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'}
                  />
                ))}
                <LabelList
                  dataKey="averageHours"
                  position="top"
                  formatter={(value: number) => formatDuration(value)}
                  fontSize={11}
                  className="fill-muted-foreground"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">Detalhamento por Etapa</h3>
            <div className="space-y-3">
              {averages.map((avg, idx) => {
                const stageConfig = JOURNEY_STAGES[idx]
                const maxHours = Math.max(...averages.map((a) => a.averageHours), 1)
                return (
                  <div key={avg.stage} className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stageConfig?.dotClass || 'bg-gray-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium truncate">{avg.label}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatDuration(avg.averageHours)}
                          {avg.count > 0 && ` (${avg.count})`}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            bottleneck?.stage === avg.stage && avg.averageHours > 0
                              ? 'bg-orange-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${(avg.averageHours / maxHours) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">Resumo da Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Tempo total médio da jornada</span>
                <span className="text-lg font-bold">{formatDuration(totalTime)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Etapa mais rápida</span>
                <span className="text-sm font-bold">
                  {averages.filter((a) => a.averageHours > 0).length > 0
                    ? `${
                        averages
                          .filter((a) => a.averageHours > 0)
                          .reduce((min, curr) =>
                            curr.averageHours < min.averageHours ? curr : min,
                          ).label
                      } (${formatDuration(
                        averages
                          .filter((a) => a.averageHours > 0)
                          .reduce((min, curr) =>
                            curr.averageHours < min.averageHours ? curr : min,
                          ).averageHours,
                      )})`
                    : 'Sem dados'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Etapa mais lenta (gargalo)</span>
                <span className="text-sm font-bold text-orange-600">
                  {bottleneck
                    ? `${bottleneck.label} (${formatDuration(bottleneck.averageHours)})`
                    : 'Sem dados'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Total de transições</span>
                <span className="text-sm font-bold">{history.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
