import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useSettings } from '@/hooks/use-settings'
import { updateClinicSettings, requestMetaSync } from '@/services/settings'
import { useToast } from '@/hooks/use-toast'
import { LogOut, Loader2, Save, Megaphone, RefreshCw } from 'lucide-react'

const CONNECTORS = [
  { value: 'facebook', label: 'Meta Ads (Facebook/Instagram)' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok Ads' },
  { value: 'linkedin', label: 'LinkedIn Ads' },
  { value: 'bing', label: 'Microsoft Ads (Bing)' },
]

const DATE_PRESETS = [
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'last_90d', label: 'Últimos 90 dias' },
]

export default function Settings() {
  const { user, signOut } = useAuth()
  const { settings, reload } = useSettings()
  const { toast } = useToast()

  const [clinicName, setClinicName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [welcome, setWelcome] = useState('')
  const [saving, setSaving] = useState(false)

  // Integração Meta Ads. A chave nunca é pré-preenchida na tela: o input começa
  // vazio e só é enviada ao backend se o usuário digitar um valor novo.
  const [windsorKey, setWindsorKey] = useState('')
  const [connector, setConnector] = useState('facebook')
  const [accountId, setAccountId] = useState('')
  const [datePreset, setDatePreset] = useState('last_30d')
  const [savingMeta, setSavingMeta] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const hasKey = Boolean(settings?.windsor_api_key)

  useEffect(() => {
    if (settings) {
      setClinicName(settings.clinic_name ?? '')
      setWhatsapp(settings.clinic_whatsapp ?? '')
      setWelcome(settings.welcome_message ?? '')
      setConnector(settings.windsor_connector || 'facebook')
      setAccountId(settings.windsor_account_id ?? '')
      setDatePreset(settings.windsor_date_preset || 'last_30d')
    }
  }, [settings])

  const handleSaveMeta = async () => {
    if (!settings) return
    setSavingMeta(true)
    try {
      const payload: Record<string, string> = {
        windsor_connector: connector,
        windsor_account_id: accountId.trim(),
        windsor_date_preset: datePreset,
      }
      if (windsorKey.trim()) payload.windsor_api_key = windsorKey.trim()
      await updateClinicSettings(settings.id, payload)
      await reload()
      setWindsorKey('')
      toast({ title: 'Salvo', description: 'Configurações da integração atualizadas.' })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a integração.',
        variant: 'destructive',
      })
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSyncNow = async () => {
    if (!settings) return
    setSyncing(true)
    try {
      await requestMetaSync(settings.id)
      toast({
        title: 'Sincronização solicitada',
        description: 'Os dados serão atualizados em alguns minutos.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível solicitar a sincronização.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

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

      {settings && (
        <Card className="shadow-sm border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <CardTitle>Integração com Meta Ads</CardTitle>
            </div>
            <CardDescription>
              Conecte sua conta de anúncios (via Windsor.ai) para ver os relatórios de campanhas na
              tela de Performance. A chave fica guardada no servidor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Chave da API (Windsor.ai)</Label>
              <Input
                type="password"
                value={windsorKey}
                onChange={(e) => setWindsorKey(e.target.value)}
                placeholder={hasKey ? '•••••••• (chave configurada — digite para alterar)' : 'Cole sua API key'}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {hasKey
                  ? 'Uma chave já está salva. Deixe em branco para mantê-la.'
                  : 'Enquanto não houver chave, a aba Campanhas fica vazia.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Plataforma</Label>
                <Select value={connector} onValueChange={setConnector}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONNECTORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Período</Label>
                <Select value={datePreset} onValueChange={setDatePreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">ID da Conta de Anúncios (opcional)</Label>
              <Input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Ex: 5899516770144006 — vazio usa todas as contas"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Última sincronização: </span>
                {settings.meta_last_sync
                  ? new Date(settings.meta_last_sync.replace(' ', 'T')).toLocaleString('pt-BR')
                  : 'nunca'}
                {settings.meta_last_status && (
                  <span className="ml-1">· {settings.meta_last_status}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSyncNow}
                  disabled={syncing || !hasKey}
                  className="gap-2"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Sincronizar agora
                </Button>
                <Button onClick={handleSaveMeta} disabled={savingMeta} className="gap-2">
                  {savingMeta ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
