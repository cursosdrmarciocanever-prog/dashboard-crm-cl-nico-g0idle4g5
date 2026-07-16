import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function Header() {
  const { user } = useAuth()
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold">{user?.name || 'Dr. Médico'}</span>
            <span className="text-xs text-muted-foreground">Endocrinologista</span>
          </div>
          <Avatar className="w-9 h-9 border border-primary/20">
            <AvatarImage src={`https://img.usecurling.com/ppl/thumbnail?gender=male&seed=doctor`} />
            <AvatarFallback>DR</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
