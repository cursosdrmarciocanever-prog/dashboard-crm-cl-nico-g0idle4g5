import { useRef, useState } from 'react'
import { listPatients, createPatient } from '@/services/patients'
import { setImplant } from '@/services/implants'
import { normalizeBR, prettyPhone, parseDateBR } from '@/lib/phone'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { format, addMonths } from 'date-fns'
import { Upload, FileUp, Loader2 } from 'lucide-react'

const DEFAULT_MONTHS = 12

interface Row {
  name: string
  phone: string
  placedAt: Date | null
  months: number
  valid: boolean
  problem?: string
}

// Cada linha: Nome, telefone, data da colocação [, duração em meses]
// Ex.: Maria Silva, 44988887777, 15/03/2026, 12
function parseRows(text: string): Row[] {
  const out: Row[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (/^(nome|name)\b/i.test(line) && /(telefone|phone|celular|contato)/i.test(line)) continue

    const parts = line
      .split(/[;,\t]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (!parts.length) continue

    // 1) data (tem / ou -)
    let datePart = ''
    for (const p of parts) {
      if (/[/-]/.test(p) && parseDateBR(p)) {
        datePart = p
        break
      }
    }
    const rest = parts.filter((p) => p !== datePart)

    // 2) duração: número puro de até 2 dígitos
    let monthsPart = ''
    for (const p of rest) {
      if (/^\d{1,2}$/.test(p)) {
        monthsPart = p
        break
      }
    }
    const rest2 = rest.filter((p) => p !== monthsPart)

    // 3) telefone: parte com mais dígitos
    let phonePart = ''
    let best = 0
    for (const p of rest2) {
      const digits = p.replace(/\D/g, '')
      if (digits.length >= 8 && digits.length > best) {
        best = digits.length
        phonePart = p
      }
    }
    const name = rest2
      .filter((p) => p !== phonePart)
      .join(' ')
      .trim()

    const n = normalizeBR(phonePart)
    const placedAt = parseDateBR(datePart)
    const months = monthsPart ? Number(monthsPart) : DEFAULT_MONTHS

    let problem: string | undefined
    if (!n.valid) problem = 'Telefone sem DDD'
    else if (!placedAt) problem = 'Data inválida'

    out.push({
      name: name || (n.phone ? 'Paciente ' + n.phone.slice(-4) : 'Paciente'),
      phone: n.phone,
      placedAt,
      months,
      valid: !problem,
      problem,
    })
  }
  return out
}

export function ImportImplantsDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const rows = parseRows(text)
  const valid = rows.filter((r) => r.valid)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result || ''))
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!valid.length) return
    setImporting(true)
    setProgress(0)

    let created = 0
    let updated = 0
    let failed = 0

    for (let i = 0; i < valid.length; i++) {
      const r = valid[i]
      try {
        // procura paciente existente pelo telefone
        const key = r.phone.replace(/^55/, '')
        const found = await listPatients(1, 5, key)
        const match = found.items.find(
          (p) => (p.phone || '').replace(/\D/g, '').replace(/^55/, '') === key,
        )

        let patientId: string
        if (match) {
          patientId = match.id
          updated++
        } else {
          const novo = await createPatient({
            name: r.name,
            phone: r.phone,
            status: 'ativo',
            journey_stage: 'novo_lead',
            traffic_platform: 'importado',
            imported: true,
          })
          patientId = novo.id
          created++
        }

        await setImplant(patientId, r.placedAt!.toISOString(), r.months)
      } catch {
        failed++
      }
      setProgress(i + 1)
    }

    setImporting(false)
    toast({
      title: 'Importação concluída',
      description: `${created} novas · ${updated} já cadastradas${failed ? ` · ${failed} falharam` : ''}. Lembretes agendados.`,
    })
    setText('')
    setOpen(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" /> Importar em massa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar pacientes de implante</DialogTitle>
          <DialogDescription>
            Uma por linha: <strong>nome, telefone, data da colocação</strong> e (opcional) a
            duração em meses. Ex.:{' '}
            <code className="rounded bg-muted px-1">Maria Silva, 44988887777, 15/03/2026, 12</code>
            . Sem a duração, assumimos {DEFAULT_MONTHS} meses. Os lembretes são agendados
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              'Maria Silva, 44988887777, 15/03/2026, 12\nAna Souza, (44) 99999-8888, 02/05/2026'
            }
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
              <FileUp className="w-4 h-4" /> Enviar arquivo (.csv)
            </Button>
            {rows.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {valid.length} válidas
                {rows.length - valid.length > 0 && ` · ${rows.length - valid.length} com problema`}
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {rows.slice(0, 200).map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {r.phone ? prettyPhone(r.phone) : '(sem telefone)'}
                      {r.placedAt && (
                        <>
                          {' · vence '}
                          {format(addMonths(r.placedAt, r.months), 'dd/MM/yyyy')}
                        </>
                      )}
                    </div>
                  </div>
                  {r.valid ? (
                    <Badge variant="outline" className="shrink-0 text-green-700 border-green-300">
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="shrink-0">
                      {r.problem}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {importing && (
            <div className="text-sm text-muted-foreground">
              Importando {progress}/{valid.length}...
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing || !valid.length} className="gap-2">
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Importar {valid.length > 0 ? valid.length : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
