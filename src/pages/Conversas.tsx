import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecentMessages, getConversation, sendMessage, type Message } from '@/services/messages'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import {
  MessageSquare,
  Send,
  Loader2,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  User,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Conversation {
  patientId: string
  name: string
  phone: string
  lastText: string
  lastAt: string
  lastDirection: 'in' | 'out'
}

export default function Conversas() {
  const navigate = useNavigate()
  const [recent, setRecent] = useState<Message[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadRecent = useCallback(async () => {
    const res = await getRecentMessages()
    setRecent(res.items)
  }, [])

  const loadThread = useCallback(async (patientId: string) => {
    const msgs = await getConversation(patientId)
    setThread(msgs)
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  // Realtime: nova mensagem recarrega a lista e a conversa aberta
  useRealtime<Message>('messages', () => {
    loadRecent()
    if (selected) loadThread(selected.patientId)
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  // Deriva a lista de conversas (última mensagem por paciente)
  const conversations = useMemo<Conversation[]>(() => {
    const byPatient = new Map<string, Conversation>()
    for (const m of recent) {
      if (!m.patient_id || byPatient.has(m.patient_id)) continue // recent já vem -created
      const p = m.expand?.patient_id
      byPatient.set(m.patient_id, {
        patientId: m.patient_id,
        name: p?.name || m.phone || 'Contato',
        phone: p?.phone || m.phone || '',
        lastText: m.text,
        lastAt: m.created,
        lastDirection: m.direction,
      })
    }
    return Array.from(byPatient.values())
  }, [recent])

  const openConversation = (c: Conversation) => {
    setSelected(c)
    loadThread(c.patientId)
  }

  const handleSend = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    const text = reply.trim()
    setReply('')
    try {
      await sendMessage(selected.patientId, selected.phone, text)
      await loadThread(selected.patientId)
    } catch {
      setReply(text) // devolve o texto em caso de erro
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">Conversas</h1>

      {/*
        No computador, lista e conversa lado a lado. No celular nao cabem as
        duas: empilhadas, sobrava uma tira de lista e uma tira de conversa, e
        nenhuma das duas dava para usar. Entao no celular aparece UMA de cada
        vez — a lista, ou a conversa aberta com um botao de voltar.
      */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[480px]">
        {/* Lista de conversas */}
        <div
          className={cn(
            'border rounded-xl bg-card overflow-y-auto',
            selected && 'hidden md:block',
          )}
        >
          {conversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Nenhuma conversa ainda. Quando alguém enviar mensagem no WhatsApp da
              clínica, aparece aqui.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.patientId}
                onClick={() => openConversation(c)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors',
                  selected?.patientId === c.patientId && 'bg-muted',
                )}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-medium text-foreground truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(c.lastAt), 'dd/MM HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {c.lastDirection === 'out' ? 'Você: ' : ''}
                  {c.lastText}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Conversa selecionada */}
        <div
          className={cn(
            'border rounded-xl bg-card flex flex-col overflow-hidden',
            !selected && 'hidden md:flex',
          )}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b bg-muted/10 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0 -ml-2"
                  onClick={() => setSelected(null)}
                  aria-label="Voltar para a lista de conversas"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">{selected.phone}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => navigate(`/pacientes/${selected.patientId}`)}
                >
                  <User className="w-4 h-4" /> Ficha
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={cn('flex', m.direction === 'out' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                        m.direction === 'out'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <div className="flex items-center gap-1 justify-end mt-1 opacity-70 text-[10px]">
                        {format(new Date(m.created), 'HH:mm')}
                        {m.direction === 'out' && <StatusIcon status={m.status} />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Escreva uma mensagem..."
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={sending || !reply.trim()} className="gap-2">
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'queued') return <Clock className="w-3 h-3" />
  if (status === 'sent') return <CheckCheck className="w-3 h-3" />
  if (status === 'failed') return <AlertCircle className="w-3 h-3 text-destructive" />
  return <Check className="w-3 h-3" />
}
