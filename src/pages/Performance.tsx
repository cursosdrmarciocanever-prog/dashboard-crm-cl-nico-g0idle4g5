import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { JourneyPerformance } from '@/components/performance/JourneyPerformance'
import { CampaignsPerformance } from '@/components/performance/CampaignsPerformance'

export default function Performance() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Performance</h1>
        <p className="text-muted-foreground mt-1">
          Tempo da jornada do paciente e retorno das campanhas de tráfego
        </p>
      </div>

      <Tabs defaultValue="jornada">
        <TabsList>
          <TabsTrigger value="jornada">Jornada do Paciente</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
        </TabsList>
        <TabsContent value="jornada" className="mt-6">
          <JourneyPerformance />
        </TabsContent>
        <TabsContent value="campanhas" className="mt-6">
          <CampaignsPerformance />
        </TabsContent>
      </Tabs>
    </div>
  )
}
