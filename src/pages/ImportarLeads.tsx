import { useRef, useState } from 'react'
import { getPatients, createPatient } from '@/services/patients'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2, FileUp, UserPlus } from 'lucide-react'

interface ParsedLead {
  name: string
  phone: string
}

function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.length <= 11) d = '55' + d
  return d
}

// Cada linha: nome e telefone separados por vírgula, ponto-e-vírgula ou tab.
// Detecta qual coluna é o telefone (a com mais dígitos), tolerando ordem invertida.
function parseLeads(text: string): { valid: ParsedLead[]; invalid: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const valid: ParsedLead[] = []
  let invalid = 0

  for (const line of lines) {
    // pula cabeçalho tipo "Nome, Telefone"
    if (/^(nome|name)\b/i.test(line) && /(telefone|phone|fone|celular|contato)/i.test(line)) {
      continue
    }
    const parts = line
      .split(/[;,\t]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length === 0) continue

    let phonePart = ''
    let best = 0
    for (const p of parts) {
      const digits = p.replace(/\D/g, '')
      if (digits.length >= 8 && digits.length > best) {
        best = digits.length
        phonePart = p
      }
    }
    const phone = normalizePhone(phonePart)
    const name = parts
      .filter((p) => p !== phonePart)
      .join(' ')
      .trim()

    if (!phone || phone.length < 12) {
      invalid++
      continue
    }
    valid.push({ name: name || 'Lead ' + phone.slice(-4), phone })
  }

  return { valid, invalid }
}

export default function ImportarLeads() {
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result || ''))
    reader.readAsText(file)
  }

  const handleImport = async () => {
    const { valid, invalid } = parseLeads(text)
    if (valid.length === 0) {
      toast({
        title: 'Nada para importar',
        description: 'Não encontrei telefones válidos na lista.',
        variant: 'destructive',
      })
      return
    }

    setImporting(true)
    setProgress(0)
    setTotal(valid.length)

    try {
      // telefones já existentes (para não duplicar)
      const existing = await getPatients()
      const existingPhones = new Set(
        existing.map((p) => (p.phone || '').replace(/\D/g, '').replace(/^55/, '')),
      )

      let created = 0
      let duplicates = 0
      let failed = 0

      for (let i = 0; i < valid.length; i++) {
        const lead = valid[i]
        const key = lead.phone.replace(/^55/, '')
        if (existingPhones.has(key)) {
          duplicates++
        } else {
          try {
            await createPatient({
              name: lead.name,
              phone: lead.phone,
              status: 'ativo',
              journey_stage: 'novo_lead',
              traffic_platform: 'importado',
              imported: true,
            })
            existingPhones.add(key)
            created++
          } catch {
            failed++
          }
        }
        setProgress(i + 1)
      }

      toast({
        title: 'Importação concluída',
        description: `${created} novos · ${duplicates} já existiam · ${invalid} inválidos${
          failed ? ` · ${failed} falharam` : ''
        }`,
      })
      setText('')
    } finally {
      setImporting(false)
    }
  }

  const preview = parseLeads(text)

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Upload className="w-7 h-7 text-primary" />
          Importar Leads
        </h1>
        <p className="text-muted-foreground mt-1">
          Cole ou envie uma lista de contatos. Cada linha: <strong>nome e telefone</strong>{' '}
          (separados por vírgula). Leads já cadastrados são ignorados, e a importação{' '}
          <strong>não</strong> dispara mensagens automáticas.
        </p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Lista de contatos</CardTitle>
          <CardDescription>
            Exemplo: <code className="rounded bg-muted px-1">João Silva, 44988887777</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'João Silva, 44988887777\nMaria Oliveira, (44) 99999-8888\n...'}
            disabled={importing}
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="gap-2"
              >
                <FileUp className="w-4 h-4" />
                Enviar arquivo (.csv)
              </Button>
            </div>

            {text.trim() && (
              <span className="text-sm text-muted-foreground">
                {preview.valid.length} válidos
                {preview.invalid > 0 && ` · ${preview.invalid} inválidos`}
              </span>
            )}
          </div>

          {importing && (
            <div className="text-sm text-muted-foreground">
              Importando {progress}/{total}...
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleImport}
              disabled={importing || preview.valid.length === 0}
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Importar {preview.valid.length > 0 ? preview.valid.length : ''} leads
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
