import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, X, Loader2, CheckCircle2 } from 'lucide-react'
import { createPatient, updatePatient, findPatientByPhone } from '@/services/patients'
import { useAuth } from '@/hooks/use-auth'
import { buildWhatsAppUrl } from '@/config'
import { cn } from '@/lib/utils'

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function WhatsAppLeadButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (open) {
      setName('')
      setPhone('')
      setErrors({})
      setSubmitError(null)
      setSuccessMessage(null)
    }
  }, [open])

  const validate = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {}
    if (!name.trim()) newErrors.name = 'Campo obrigatório'
    const phoneDigits = phone.replace(/\D/g, '')
    if (!phoneDigits) {
      newErrors.phone = 'Campo obrigatório'
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Telefone inválido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)
    if (!validate()) return

    setLoading(true)
    try {
      const existing = await findPatientByPhone(phone)
      if (existing) {
        await updatePatient(existing.id, {
          last_contact_date: new Date().toISOString(),
          traffic_platform: 'whatsapp',
        })
        setSuccessMessage(
          'Contato já cadastrado. Atualizando informações e redirecionando para WhatsApp...',
        )
      } else {
        await createPatient({
          name: name.trim(),
          phone: phone.trim(),
          status: 'ativo',
          traffic_platform: 'whatsapp',
          journey_stage: 'novo_lead',
          last_contact_date: new Date().toISOString(),
          doctor_id: user?.id ?? undefined,
          campaign_name: '',
          ad_set_name: '',
          ad_name: '',
          exams_sent_flag: false,
          exams_received_flag: false,
          anamnesis_sent_flag: false,
          questionnaire_answered_flag: false,
        })
        setSuccessMessage('Novo lead registrado com sucesso! Redirecionando para WhatsApp...')
      }
      setTimeout(() => {
        window.open(buildWhatsAppUrl(), '_blank', 'noopener,noreferrer')
        setOpen(false)
        setLoading(false)
      }, 1000)
    } catch {
      setSubmitError('Não foi possível registrar o contato. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Falar no WhatsApp"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
      >
        <MessageCircle className="h-7 w-7" />
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-30" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Fale conosco no WhatsApp
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Deixe seus dados e iniciaremos uma conversa com você.
            </p>
          </DialogHeader>
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          {successMessage ? (
            <div className="flex flex-col items-center gap-3 py-6 animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <p className="text-center text-sm font-medium text-foreground">{successMessage}</p>
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="wa-name">Nome</Label>
                <Input
                  id="wa-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
                  }}
                  placeholder="Seu nome completo"
                  className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-phone">Telefone</Label>
                <Input
                  id="wa-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhoneInput(e.target.value))
                    if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }))
                  }}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                  className={cn(errors.phone && 'border-red-500 focus-visible:ring-red-500')}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              {submitError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                  {submitError}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={loading} className="w-full gap-2">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  Falar no WhatsApp
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
