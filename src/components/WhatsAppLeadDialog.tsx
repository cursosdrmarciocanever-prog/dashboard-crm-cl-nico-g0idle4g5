import { useState } from 'react'
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
import { MessageCircle, Loader2, X, CheckCircle2 } from 'lucide-react'
import { createPatient, updatePatient, findPatientByPhone } from '@/services/patients'
import { buildWhatsAppUrl } from '@/config'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface FieldErrors {
  name?: string
  phone?: string
}

interface WhatsAppLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WhatsAppLeadDialog({ open, onOpenChange }: WhatsAppLeadDialogProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { user } = useAuth()

  const resetForm = () => {
    setName('')
    setPhone('')
    setFieldErrors({})
    setSubmitError(null)
    setSuccessMessage(null)
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Campo obrigatório'
    if (!phone.trim()) {
      errors.phone = 'Campo obrigatório'
    } else if (phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Telefone inválido'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
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
        window.open(buildWhatsAppUrl(), '_blank')
        resetForm()
        onOpenChange(false)
        setLoading(false)
      }, 1000)
    } catch {
      setSubmitError('Não foi possível registrar o contato. Tente novamente.')
      setLoading(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm()
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Falar no WhatsApp
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        {successMessage ? (
          <div className="flex flex-col items-center gap-3 py-6 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <p className="text-center text-sm font-medium text-foreground">{successMessage}</p>
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-name">Nome</Label>
              <Input
                id="whatsapp-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }))
                }}
                placeholder="Seu nome"
                className={cn(fieldErrors.name && 'border-red-500 focus-visible:ring-red-500')}
              />
              {fieldErrors.name && <p className="text-sm text-red-500">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Telefone</Label>
              <Input
                id="whatsapp-phone"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value))
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }))
                }}
                placeholder="(11) 99999-9999"
                className={cn(fieldErrors.phone && 'border-red-500 focus-visible:ring-red-500')}
              />
              {fieldErrors.phone && <p className="text-sm text-red-500">{fieldErrors.phone}</p>}
            </div>
            {submitError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-3">
                {submitError}
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                Falar no WhatsApp
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
