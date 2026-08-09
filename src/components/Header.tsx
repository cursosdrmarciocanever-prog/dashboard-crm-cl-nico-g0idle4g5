import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Activity, Sun, Moon, LogOut, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function Header() {
  const { user, isAdmin, signOut } = useAuth()
  const { logoUrl } = useSettings()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)

  // A secretaria tambem usa o CRM: nao rotular todo mundo de endocrinologista.
  const displayName = user?.name || (isAdmin ? 'Dr. Márcio Canever' : 'Secretaria')
  const roleLabel = isAdmin ? 'Endocrinologista' : 'Secretaria'

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/pacientes?q=${encodeURIComponent(query.trim())}`)
      setBuscaAberta(false)
    }
  }

  return (
    <header className="sticky top-0 z-10 bg-card border-b pt-safe px-safe">
      <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2 flex-1">
        <SidebarTrigger className="md:hidden touch-target" />
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
      <div className="flex items-center gap-1 sm:gap-4">
        {/* No celular a busca nao cabe na barra: abre numa linha propria. */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden touch-target"
          onClick={() => setBuscaAberta((v) => !v)}
          aria-label="Buscar paciente"
          aria-expanded={buscaAberta}
        >
          <Search className="w-5 h-5 text-muted-foreground" />
        </Button>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-3 border-l pl-4 rounded-md hover:opacity-80 transition-opacity"
              aria-label="Menu do usuário"
            >
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold">{displayName}</span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
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
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
              <LogOut className="w-4 h-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>

      {buscaAberta && (
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Nome ou telefone — toque em buscar"
              className="pl-9 bg-background border-border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearch}
              // O teclado do iPhone mostra "Buscar" no lugar de "Enter".
              enterKeyHint="search"
              type="search"
            />
          </div>
        </div>
      )}
    </header>
  )
}
