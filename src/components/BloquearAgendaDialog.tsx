import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarOff, Loader2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAgendaBlocks } from '@/hooks/use-agenda-blocks'
import { createAgendaBlock, deleteAgendaBlock } from '@/services/agenda-blocks'
import { descreverBloqueio } from '@/lib/agenda-block'
import { diaParaData, HORARIOS_DISPONIVEIS, TURNOS_DE_ATENDIMENTO } from '@/lib/appointment-time'
import { getAppointments } from '@/services/appointments'

/** Mesmo formato usado ao criar consulta. */
const paraPocketBase = (d: Date) => d.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

const hoje = () => format(new Date(), 'yyyy-MM-dd')

/** 'AAAA-MM-DD' + 'HH:mm' → Date local. */
const juntar = (dia: string, hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  const d = diaParaData(dia)
  d.setHours(h, m, 0, 0)
  return d
}

/**
 * Fecha a agenda em dias e horários que não haverá atendimento.
 *
 * Dia inteiro aceita um intervalo (férias, congresso) e vira UM registro, não
 * um por dia. Bloqueio de horário fecha uma faixa dentro de um dia só.
 */
export function BloquearAgendaDialog({ onChanged }: { onChanged?: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [diaTodo, setDiaTodo] = useState(true)
  const [de, setDe] = useState(hoje())
  const [ate, setAte] = useState(hoje())
  const [daHora, setDaHora] = useState('13:30')
  const [ateHora, setAteHora] = useState('18:00')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()
  const { blocos, recarregar } = useAgendaBlocks()

  // Só o que ainda está por vir: bloqueio vencido não é decisão a rever, e a
  // lista viraria um histórico crescente dentro de um diálogo de ação.
  const ativos = useMemo(() => {
    const agora = Date.now()
    return blocos
      .filter((b) => new Date(b.ends_at).getTime() >= agora)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
  }, [blocos])

  const limpar = () => {
    setDiaTodo(true)
    setDe(hoje())
    setAte(hoje())
    setDaHora('13:30')
    setAteHora('18:00')
    setMotivo('')
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!de) return

    const inicio = diaTodo ? diaParaData(de) : juntar(de, daHora)
    const fim = diaTodo ? diaParaData(ate || de) : juntar(de, ateHora)

    if (diaTodo) {
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
    }

    if (fim.getTime() < inicio.getTime()) {
      toast({
        title: 'Intervalo invertido',
        description: diaTodo
          ? 'A data final é anterior à inicial.'
          : 'O horário final é anterior ao inicial.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      // Consultas já marcadas dentro do período não são apagadas — cancelar
      // consulta de paciente é decisão dele, não efeito colateral de fechar a
      // agenda. Mas ele precisa saber que elas existem.
      const jaMarcadas = (await getAppointments()).filter((a) => {
        if (a.status !== 'scheduled') return false
        const t = new Date(a.appointment_date).getTime()
        return t >= inicio.getTime() && t <= fim.getTime()
      })

      await createAgendaBlock({
        starts_at: paraPocketBase(inicio),
        ends_at: paraPocketBase(fim),
        all_day: diaTodo,
        reason: motivo.trim(),
      })

      await recarregar()
      setAberto(false)
      limpar()
      onChanged?.()

      toast({
        title: 'Agenda bloqueada',
        description: jaMarcadas.length
          ? `${jaMarcadas.length} consulta${jaMarcadas.length > 1 ? 's já marcadas continuam' : ' já marcada continua'} nesse período — remarque ou cancele pela agenda.`
          : 'Nenhuma consulta será marcada nesse período.',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível bloquear a agenda.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const remover = async (id: string) => {
    try {
      await deleteAgendaBlock(id)
      await recarregar()
      onChanged?.()
      toast({ title: 'Bloqueio removido', description: 'A agenda voltou a aceitar marcações.' })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o bloqueio.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shadow-sm">
          <CalendarOff className="w-4 h-4" /> Bloquear agenda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bloquear agenda</DialogTitle>
        </DialogHeader>

        <form onSubmit={salvar} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Dia inteiro</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Desligue para fechar só uma parte do dia.
              </p>
            </div>
            <Switch checked={diaTodo} onCheckedChange={setDiaTodo} />
          </div>

          {diaTodo ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>De</Label>
                <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Até</Label>
                <Input
                  type="date"
                  value={ate}
                  min={de}
                  onChange={(e) => setAte(e.target.value)}
                  required
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Para um dia só, deixe as duas datas iguais. Férias e congressos entram como um
                período único.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Dia</Label>
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} required />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-2">
                  <Label className="text-xs">Das</Label>
                  <SeletorDeHora valor={daHora} onChange={setDaHora} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Até</Label>
                  <SeletorDeHora valor={ateHora} onChange={setAteHora} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Os dois horários entram no bloqueio: das 13:30 às 18:00 fecha também as 18:00.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Congresso, férias, feriado..."
            />
            <p className="text-xs text-muted-foreground">
              Aparece no calendário e explica a recusa para quem tentar marcar.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Bloquear
            </Button>
          </DialogFooter>
        </form>

        {ativos.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Bloqueios ativos</p>
            <ul className="space-y-1.5">
              {ativos.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 dark:border-rose-900 dark:bg-rose-950/40"
                >
                  <span className="text-xs text-rose-900 dark:text-rose-200 min-w-0">
                    <span className="font-medium">{descreverBloqueio(b)}</span>
                    {b.reason && ` — ${b.reason}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-rose-700 hover:text-rose-900 dark:text-rose-300"
                    title="Remover bloqueio"
                    onClick={() => remover(b.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Lista de horários da clínica, agrupada por turno. */
function SeletorDeHora({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const foraDaGrade = valor && !HORARIOS_DISPONIVEIS.includes(valor) ? valor : null
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Horário" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {foraDaGrade && <SelectItem value={foraDaGrade}>{foraDaGrade}</SelectItem>}
        {TURNOS_DE_ATENDIMENTO.map((turno) => (
          <SelectGroup key={turno.rotulo}>
            <SelectLabel>{turno.rotulo}</SelectLabel>
            {turno.horarios.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
