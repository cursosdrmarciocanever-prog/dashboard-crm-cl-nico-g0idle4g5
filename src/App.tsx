import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { SettingsProvider } from '@/hooks/use-settings'
import { ThemeProvider } from '@/hooks/use-theme'

import Layout from './components/Layout'
import Index from './pages/Index'
import Login from './pages/Login'
import Patients from './pages/Patients'
import PacienteDetalhe from './pages/PacienteDetalhe'
import Appointments from './pages/Appointments'
import PatientJourney from './pages/PatientJourney'
import ScheduledMessages from './pages/ScheduledMessages'
import Conversas from './pages/Conversas'
import Automacoes from './pages/Automacoes'
import ImportarLeads from './pages/ImportarLeads'
import Implantes from './pages/Implantes'
import Receitas from './pages/Receitas'
import Performance from './pages/Performance'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SettingsProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/pacientes" element={<Patients />} />
            <Route path="/pacientes/:id" element={<PacienteDetalhe />} />
            <Route path="/importar" element={<ImportarLeads />} />
            <Route path="/implantes" element={<Implantes />} />
            <Route path="/jornada" element={<PatientJourney />} />
            <Route path="/agendamentos" element={<Appointments />} />
            <Route path="/conversas" element={<Conversas />} />
            <Route path="/mensagens" element={<ScheduledMessages />} />
            <Route path="/receitas" element={<Receitas />} />
            <Route path="/automacoes" element={<Automacoes />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
    </ThemeProvider>
  </BrowserRouter>
)

export default App
