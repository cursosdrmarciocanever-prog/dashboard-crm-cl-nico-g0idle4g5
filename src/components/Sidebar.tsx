import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, Settings, Activity } from 'lucide-react'
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

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Pacientes', path: '/pacientes' },
  { icon: Calendar, label: 'Agendamentos', path: '/agendamentos' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <ShadcnSidebar>
      <SidebarHeader className="p-4 border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight">EndoClinic</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 p-2">
              {menuItems.map((item) => (
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
