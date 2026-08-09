import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Loader2 } from 'lucide-react'
import { SidebarProvider } from '@/components/ui/sidebar'

export default function Layout() {
  const { isAuthenticated, loading } = useAuth()

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    )
  if (!isAuthenticated) return <Navigate to="/login" />

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          {/* pb-safe: instalado no iPhone, a barra de gestos comeria o ultimo
              botao da pagina. px-safe cobre o entalhe na horizontal. */}
          <main className="flex-1 p-4 md:p-8 pb-safe px-safe animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
