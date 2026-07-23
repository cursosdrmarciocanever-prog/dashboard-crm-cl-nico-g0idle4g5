import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useSettings } from '@/hooks/use-settings'
import { updateClinicSettings } from '@/services/settings'
import { useToast } from '@/hooks/use-toast'
import { LogOut, Loader2, Save } from 'lucide-react'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { settings, reload } = useSettings()
  const { toast } = useToast()

  const [clinicName, setClinicName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [welcome, setWelcome] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setClinicName(settings.clinic_name ?? '')
      setWhatsapp(settings.clinic_whatsapp ?? '')
      setWelcome(settings.welcome_message ?? '')
    }
  }, [settings])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await updateClinicSettings(settings.id, {
        clinic_name: clinicName.trim(),
        clinic_whatsapp: whatsapp.replace(/\D/g, ''),
        welcome_message: welcome.trim(),
      })
      await reload()
      toast({ title: 'Salvo', description: 'Configurações da clínica atualizadas.' })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Configurações da Clínica</CardTitle>
          <CardDescription>
            Número de WhatsApp e mensagem usados na captação de leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!settings ? (
            <p className="text-sm text-muted-foreground">
              Coleção de configurações indisponível no backend. Aplique a migration{' '}
              <code className="rounded bg-muted px-1 py-0.5">0014_create_settings_collection</code>{' '}
              no PocketBase para habilitar a edição.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-foreground">Nome da Clínica</Label>
                <Input
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Clínica Canever"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">WhatsApp da Clínica</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="5544999999999"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  Somente dígitos, com DDI e DDD. Ex.: 5544999999999
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Mensagem de Boas-vindas</Label>
                <Input
                  value={welcome}
                  onChange={(e) => setWelcome(e.target.value)}
                  placeholder="Olá! Vim pelo site da clínica..."
                />
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Perfil do Médico</CardTitle>
          <CardDescription>Suas informações de acesso ao CRM.</CardDescription>
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
