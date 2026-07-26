import { useRef, useState } from 'react'
import { getPatients, createPatient } from '@/services/patients'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Upload, Loader2, FileUp, UserPlus } from 'lucide-react'

import { normalizeBR, prettyPhone, type PhoneNote } from '@/lib/phone'

interface ParsedLead {
  name: string
  original: string
  phone: string // formato final (55 + DDD + numero), '' se invalido
  valid: boolean
  note: PhoneNote
}

function parseLeads(text: string): ParsedLead[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const out: ParsedLead[] = []
  for (const line of lines) {
    if (/^(nome|name)\b/i.test(line) && /(telefone|phone|fone|celular|contato)/i.test(line)) {
      continue // cabeçalho
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
    const name = parts
      .filter((p) => p !== phonePart)
      .join(' ')
      .trim()

    const n = normalizeBR(phonePart)
    out.push({
      name: name || (n.phone ? 'Lead ' + n.phone.slice(-4) : 'Lead'),
      original: phonePart || line,
      phone: n.phone,
      valid: n.valid,
      note: n.note,
    })
  }
  return out
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

  const leads = parseLeads(text)
  const validLeads = leads.filter((l) => l.valid)
  const invalidCount = leads.length - validLeads.length

  const handleImport = async () => {
    if (validLeads.length === 0) {
      toast({
        title: 'Nada para importar',
        description: 'Não encontrei telefones válidos (lembre do DDD).',
        variant: 'destructive',
      })
      return
    }

    setImporting(true)
    setProgress(0)
    setTotal(validLeads.length)

    try {
      const existing = await getPatients()
      const existingPhones = new Set(
        existing.map((p) => (p.phone || '').replace(/\D/g, '').replace(/^55/, '')),
      )

      let created = 0
      let duplicates = 0
      let failed = 0

      for (let i = 0; i < validLeads.length; i++) {
        const lead = validLeads[i]
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
        description: `${created} novos · ${duplicates} já existiam · ${invalidCount} inválidos${
          failed ? ` · ${failed} falharam` : ''
        }`,
      })
      setText('')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Upload className="w-7 h-7 text-primary" />
          Importar Leads
        </h1>
        <p className="text-muted-foreground mt-1">
          Cole ou envie uma lista: cada linha com <strong>nome e telefone</strong>. O sistema
          corrige o formato (adiciona o 55 e o 9 quando faltar) e ignora quem já existe. Não
          dispara mensagens.
        </p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Lista de contatos</CardTitle>
          <CardDescription>
            Ex.: <code className="rounded bg-muted px-1">João Silva, 44988887777</code> — sempre
            com <strong>DDD</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'João Silva, 44988887777\nMaria Oliveira, (44) 99999-8888\n...'}
            disabled={importing}
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
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
            {leads.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {validLeads.length} válidos
                {invalidCount > 0 && ` · ${invalidCount} com problema`}
              </span>
            )}
          </div>

          {leads.length > 0 && (
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {leads.slice(0, 200).map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {l.valid ? prettyPhone(l.phone) : l.original || '(sem número)'}
                    </div>
                  </div>
                  {!l.valid ? (
                    <Badge variant="destructive" className="shrink-0">
                      Sem DDD
                    </Badge>
                  ) : l.note === 'add9' ? (
                    <Badge variant="secondary" className="shrink-0">
                      9 adicionado
                    </Badge>
                  ) : l.note === 'fixo' ? (
                    <Badge variant="outline" className="shrink-0">
                      Fixo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-green-700 border-green-300">
                      OK
                    </Badge>
                  )}
                </div>
              ))}
              {leads.length > 200 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  +{leads.length - 200} não exibidos (serão importados normalmente)
                </div>
              )}
            </div>
          )}

          {importing && (
            <div className="text-sm text-muted-foreground">
              Importando {progress}/{total}...
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleImport}
              disabled={importing || validLeads.length === 0}
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Importar {validLeads.length > 0 ? validLeads.length : ''} leads
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
