import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Activity, Sun, Moon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function Header() {
  const { user } = useAuth()
  const { logoUrl } = useSettings()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/pacientes?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-card border-b">
      <div className="flex items-center gap-2 flex-1">
        <SidebarTrigger className="md:hidden" />
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente por nome (pressione Enter)..."
            className="pl-9 bg-background border-border"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Alternar tema"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="relative hidden sm:inline-flex">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold">{user?.name || 'Dr. Médico'}</span>
            <span className="text-xs text-muted-foreground">Endocrinologista</span>
          </div>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo da clínica"
              className="h-9 w-auto max-w-[150px] object-contain rounded"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
