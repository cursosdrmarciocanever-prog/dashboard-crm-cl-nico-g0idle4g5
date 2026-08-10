import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  FileText,
  Plus,
  Loader2,
  Check,
  X,
  Search,
  UserPlus,
  CalendarCheck,
  CalendarClock,
  Pill,
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  getPrescriptionRequests,
  createPrescriptionRequest,
  decidePrescriptionRequest,
  type PrescriptionRequest,
} from '@/services/prescriptions'
import { listPatients, createPatient, type Patient } from '@/services/patients'
import { getPatientAppointments } from '@/services/appointments'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

/**
 * Solicitações de receita: a secretária abre o pedido, o médico aprova ou
 * reprova.
 *
 * Quem decide é o servidor, não esta tela — a coleção nega alteração à
 * secretaria (migration 0033). Os botões escondidos aqui são conveniência.
 */

/**
 * <input type="date"> devolve '2026-08-10'. Convertido direto, viraria meia-noite
 * UTC — que em Brasília é o dia ANTERIOR, e a data apareceria errada por um dia.
 * Fixar meio-dia resolve para qualquer fuso do país.
 */
const paraISO = (dia: string) => new Date(`${dia}T12:00:00`).toISOString()
const paraInput = (iso?: string) => (iso ? format(new Date(iso), 'yyyy-MM-dd') : '')
const exibirData = (iso?: string) => (iso ? format(new Date(iso), 'dd/MM/yyyy') : '—')

const statusVisual: Record<
  PrescriptionRequest['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive'; borda?: string }
> = {
  pending: { label: 'Aguardando o médico', variant: 'default', borda: 'border-amber-400' },
  approved: { label: 'Aprovada', variant: 'secondary', borda: 'border-emerald-400' },
  rejected: { label: 'Reprovada', variant: 'destructive' },
}

export default function Receitas() {
  const [pedidos, setPedidos] = useState<PrescriptionRequest[]>([])
  const [carregando, setCarregando] = useState(true)
  const { isAdmin, user } = useAuth()
  const { toast } = useToast()

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setPedidos(await getPrescriptionRequests())
    } catch {
      setPedidos([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])
  useRealtime('prescription_requests', carregar)

  // Pendentes primeiro: são as que exigem ação.
  const ordenados = useMemo(() => {
    const peso = (s: PrescriptionRequest['status']) => (s === 'pending' ? 0 : 1)
    return [...pedidos].sort((a, b) => peso(a.status) - peso(b.status))
  }, [pedidos])

  const pendentes = pedidos.filter((p) => p.status === 'pending').length

  const decidir = async (
    pedido: PrescriptionRequest,
    status: 'approved' | 'rejected',
    nota?: string,
  ) => {
    try {
      const quem = user?.name || user?.email || 'médico'
      await decidePrescriptionRequest(pedido.id, status, quem, nota)
      await carregar()
      toast({
        title: status === 'approved' ? 'Receita aprovada' : 'Receita reprovada',
        description: pedido.expand?.patient_id?.name ?? '',
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a decisão.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            Solicitações de Receita
          </h1>
          <p className="text-muted-foreground mt-1">
            {pendentes > 0
              ? `${pendentes} aguardando o médico.`
              : 'Nenhuma solicitação aguardando.'}
          </p>
        </div>
        <NovaSolicitacaoDialog onCriada={carregar} />
      </div>

      {carregando && <Loader2 className="w-6 h-6 animate-spin mx-auto my-12 text-primary" />}

      {!carregando && ordenados.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Nenhuma solicitação registrada ainda.
        </div>
      )}

      <div className="space-y-3">
        {ordenados.map((p) => (
          <CartaoPedido
            key={p.id}
            pedido={p}
            podeDecidir={isAdmin}
            onDecidir={(status, nota) => decidir(p, status, nota)}
          />
        ))}
      </div>
    </div>
  )
}

function CartaoPedido({
  pedido,
  podeDecidir,
  onDecidir,
}: {
  pedido: PrescriptionRequest
  podeDecidir: boolean
  onDecidir: (status: 'approved' | 'rejected', nota?: string) => Promise<void>
}) {
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const visual = statusVisual[pedido.status]

  const executar = async (status: 'approved' | 'rejected', nota?: string) => {
    setSalvando(true)
    try {
      await onDecidir(status, nota)
    } finally {
      setSalvando(false)
      setRecusando(false)
      setMotivo('')
    }
  }

  return (
    <div className={cn('bg-card border rounded-xl shadow-sm p-4 space-y-3', visual.borda)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            to={`/pacientes/${pedido.patient_id}`}
            className="font-semibold text-foreground hover:underline"
          >
            {pedido.expand?.patient_id?.name ?? 'Paciente removido'}
          </Link>
          <p className="flex items-center gap-1.5 text-sm text-foreground mt-1">
            <Pill className="w-4 h-4 text-primary shrink-0" />
            {pedido.medication}
          </p>
        </div>
        <Badge variant={visual.variant} className="shrink-0">
          {visual.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
          Última consulta: {exibirData(pedido.last_visit_at)}
        </p>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
          Próxima consulta: {exibirData(pedido.next_visit_at)}
        </p>
      </div>

      {pedido.status !== 'pending' && (
        <p className="text-xs text-muted-foreground border-t pt-2">
          {pedido.status === 'approved' ? 'Aprovada' : 'Reprovada'} por{' '}
          {pedido.decided_by || '—'} em {exibirData(pedido.decided_at)}
          {pedido.decision_note ? ` — ${pedido.decision_note}` : ''}
        </p>
      )}

      {pedido.status === 'pending' && podeDecidir && (
        <div className="border-t pt-3">
          {recusando ? (
            <div className="space-y-2">
              <Label>Motivo da recusa (opcional)</Label>
              <Textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: precisa reavaliar antes de renovar"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRecusando(false)}>
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={salvando}
                  onClick={() => executar('rejected', motivo.trim())}
                >
                  Confirmar recusa
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className="gap-1.5 touch-target"
                disabled={salvando}
                onClick={() => setRecusando(true)}
              >
                <X className="w-4 h-4" /> Reprovar
              </Button>
              <Button
                className="gap-1.5 touch-target"
                disabled={salvando}
                onClick={() => executar('approved')}
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Aprovar
              </Button>
            </div>
          )}
        </div>
      )}

      {pedido.status === 'pending' && !podeDecidir && (
        <p className="text-xs text-muted-foreground border-t pt-2">
          Enviada para o Dr. Márcio. A aprovação aparece aqui quando ele decidir.
        </p>
      )}
    </div>
  )
}

function NovaSolicitacaoDialog({ onCriada }: { onCriada: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Patient[]>([])
  const [buscando, setBuscando] = useState(false)
  const [paciente, setPaciente] = useState<Patient | null>(null)

  // Cadastro de paciente novo, quando a busca não encontra
  const [cadastrando, setCadastrando] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')

  const [ultima, setUltima] = useState('')
  const [proxima, setProxima] = useState('')
  const [medicamento, setMedicamento] = useState('')
  const [salvando, setSalvando] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  const limpar = () => {
    setBusca('')
    setResultados([])
    setPaciente(null)
    setCadastrando(false)
    setNovoNome('')
    setNovoTelefone('')
    setUltima('')
    setProxima('')
    setMedicamento('')
  }

  // Busca com respiro: digitar não dispara uma consulta por tecla.
  useEffect(() => {
    if (!aberto || paciente || busca.trim().length < 2) {
      setResultados([])
      return
    }
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const res = await listPatients(1, 8, busca.trim())
        setResultados(res.items)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [aberto, busca, paciente])

  /**
   * Ao escolher o paciente, as duas datas vêm prontas do mesmo calendário da
   * aba Agendamentos. A secretária confere em vez de procurar — e continuam
   * editáveis, porque paciente antigo pode ter consulta que o CRM não viu.
   */
  const escolher = async (p: Patient) => {
    setPaciente(p)
    setResultados([])
    setBusca('')
    try {
      const consultas = await getPatientAppointments(p.id)
      const agora = Date.now()
      const validas = consultas
        .filter((c) => c.status !== 'cancelled' && c.appointment_date)
        .sort((a, b) => +new Date(a.appointment_date) - +new Date(b.appointment_date))
      const passadas = validas.filter((c) => +new Date(c.appointment_date) < agora)
      const futuras = validas.filter((c) => +new Date(c.appointment_date) >= agora)
      if (passadas.length) setUltima(paraInput(passadas[passadas.length - 1].appointment_date))
      if (futuras.length) setProxima(paraInput(futuras[0].appointment_date))
    } catch {
      // Sem consultas no CRM: a secretária preenche na mão.
    }
  }

  const cadastrarPaciente = async () => {
    if (!novoNome.trim()) return
    setSalvando(true)
    try {
      const criado = await createPatient({
        name: novoNome.trim(),
        phone: novoTelefone.trim(),
        status: 'ativo',
        journey_stage: 'novo_lead',
        // Marca a origem: sem isso, quem nasce aqui apareceria no resumo do dia
        // como "lead novo" sem explicacao, misturado com quem veio de anuncio.
        traffic_platform: 'receita',
      })
      setPaciente(criado)
      setCadastrando(false)
      toast({ title: 'Paciente cadastrado', description: criado.name })
    } catch (err) {
      // O servidor barra telefone repetido e explica de quem é (hook phone_key).
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        'Não foi possível cadastrar.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // O botão de enviar só libera com TUDO preenchido — é o que faz a solicitação
  // chegar completa para o médico decidir.
  const completo = !!paciente && !!ultima && !!proxima && !!medicamento.trim()

  const enviar = async () => {
    if (!completo || !paciente) return
    setSalvando(true)
    try {
      await createPrescriptionRequest({
        patient_id: paciente.id,
        medication: medicamento.trim(),
        last_visit_at: paraISO(ultima),
        next_visit_at: paraISO(proxima),
        requested_by: user?.name || user?.email || '',
      })
      toast({
        title: 'Solicitação enviada',
        description: 'O médico vai aprovar ou reprovar.',
      })
      limpar()
      setAberto(false)
      onCriada()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a solicitação.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v)
        if (!v) limpar()
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 touch-target">
          <Plus className="w-4 h-4" /> Nova solicitação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar receita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1) Paciente */}
          <div className="space-y-2">
            <Label>Paciente</Label>
            {paciente ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{paciente.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {paciente.phone || 'sem telefone'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPaciente(null)}>
                  Trocar
                </Button>
              </div>
            ) : cadastrando ? (
              <div className="space-y-2 rounded-lg border p-3">
                <Input
                  placeholder="Nome completo"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                />
                <Input
                  placeholder="Telefone (opcional)"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  inputMode="numeric"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCadastrando(false)}>
                    Voltar
                  </Button>
                  <Button size="sm" onClick={cadastrarPaciente} disabled={salvando || !novoNome.trim()}>
                    Cadastrar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nome ou telefone..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                {buscando && (
                  <p className="text-xs text-muted-foreground">Procurando...</p>
                )}
                {resultados.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {resultados.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => escolher(p)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                      >
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground block">
                          {p.phone || 'sem telefone'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {busca.trim().length >= 2 && !buscando && resultados.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum paciente com esse nome.</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-full"
                  onClick={() => {
                    setCadastrando(true)
                    setNovoNome(busca.trim())
                  }}
                >
                  <UserPlus className="w-4 h-4" /> Não está na lista — cadastrar
                </Button>
              </>
            )}
          </div>

          {/* 2) Datas — vêm prontas do calendário quando o CRM conhece */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Última consulta</Label>
              <Input type="date" value={ultima} onChange={(e) => setUltima(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Próxima consulta</Label>
              <Input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} />
            </div>
          </div>
          {paciente && (ultima || proxima) && (
            <p className="text-xs text-muted-foreground -mt-2">
              Datas preenchidas pelo calendário do CRM. Confira e corrija se precisar.
            </p>
          )}

          {/* 3) Medicamento */}
          <div className="space-y-2">
            <Label>Medicamento solicitado</Label>
            <Input
              value={medicamento}
              onChange={(e) => setMedicamento(e.target.value)}
              placeholder="Nome, dose e apresentação"
            />
          </div>

          {!completo && (
            <p className="text-xs text-muted-foreground">
              Preencha paciente, as duas datas e o medicamento para enviar ao médico.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!completo || salvando} className="gap-2">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar para aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
