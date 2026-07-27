import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Upload,
  Calendar,
  Settings,
  Activity,
  KanbanSquare,
  MessageSquare,
  MessagesSquare,
  Bot,
  Syringe,
  TrendingUp,
} from 'lucide-react'
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { useSettings } from '@/hooks/use-settings'
import { useAuth } from '@/hooks/use-auth'

interface MenuItem {
  icon: typeof LayoutDashboard
  label: string
  path: string
  adminOnly?: boolean
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Pacientes', path: '/pacientes' },
  { icon: Upload, label: 'Importar Leads', path: '/importar' },
  { icon: Syringe, label: 'Implantes', path: '/implantes' },
  { icon: KanbanSquare, label: 'Jornada do Paciente', path: '/jornada' },
  { icon: MessagesSquare, label: 'Conversas', path: '/conversas' },
  { icon: Calendar, label: 'Agendamentos', path: '/agendamentos' },
  { icon: MessageSquare, label: 'Mensagens Agendadas', path: '/mensagens' },
  { icon: Bot, label: 'Automações', path: '/automacoes', adminOnly: true },
  { icon: TrendingUp, label: 'Performance', path: '/performance', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', adminOnly: true },
]

export function Sidebar() {
  const location = useLocation()
  const { logoUrl } = useSettings()
  const { isAdmin } = useAuth()

  // A secretaria nao ve automacoes, performance e configuracoes da clinica.
  const visibleItems = menuItems.filter((item) => isAdmin || !item.adminOnly)

  return (
    <ShadcnSidebar>
      <SidebarHeader className="p-4 border-b bg-background/50 backdrop-blur-sm">
        {logoUrl ? (
          <img src={logoUrl} alt="Clínica Canever" className="h-10 w-auto max-w-full object-contain" />
        ) : (
          <div className="flex items-center gap-2 text-primary">
            <Activity className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">Clínica Canever</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 p-2">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    className="text-base h-11 px-4"
                  >
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </ShadcnSidebar>
  )
}
