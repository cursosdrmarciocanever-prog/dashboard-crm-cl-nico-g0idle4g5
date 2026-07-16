import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { LogOut } from 'lucide-react'

export default function Settings() {
  const { user, signOut } = useAuth()

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Perfil do Médico</CardTitle>
          <CardDescription>Atualize suas informações pessoais de acesso ao CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground">Nome Completo</Label>
            <Input defaultValue={user?.name || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">E-mail Profissional</Label>
            <Input defaultValue={user?.email || ''} disabled className="bg-muted/50" />
          </div>
          <div className="pt-6 border-t mt-6 flex justify-end">
            <Button variant="destructive" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
