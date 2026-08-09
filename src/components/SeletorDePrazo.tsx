import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  compor,
  decompor,
  descrever,
  type Sentido,
  type Unidade,
} from '@/lib/offset'

interface Props {
  /** Prazo em minutos assinados: negativo = antes, positivo = depois. */
  minutos: number
  onChange: (minutos: number) => void
  /** Unidades que fazem sentido para esta automação. */
  unidades?: Unidade[]
  /** Quando só há um sentido possível (follow-up é sempre "depois"). */
  sentidos?: Sentido[]
  rotulo?: string
  /** Como a frase de conferência termina. */
  ancora: { zero: string; antes: string; depois: string }
}

/**
 * Controle único de prazo das automações — quantidade + unidade + antes/depois.
 *
 * Existe um só para as três automações (consulta, implante, estágio) porque a
 * pergunta é sempre a mesma, e porque cada uma guardava o valor numa unidade
 * diferente no banco: quem edita não deveria precisar saber que o lembrete de
 * consulta é gravado em horas e o de implante em dias.
 */
export function SeletorDePrazo({
  minutos,
  onChange,
  unidades = ['dias', 'horas'],
  sentidos = ['antes', 'depois'],
  rotulo = 'Quando enviar',
  ancora,
}: Props) {
  const atual = decompor(minutos, unidades)
  // Com um sentido só, o valor guardado manda mais que o decomposto: um zero
  // não deve virar "antes" numa automação que só sabe enviar depois.
  const sentido: Sentido = sentidos.length === 1 ? sentidos[0] : atual.sentido

  const emitir = (mudanca: Partial<{ quantidade: number; unidade: Unidade; sentido: Sentido }>) =>
    onChange(
      compor({
        quantidade: mudanca.quantidade ?? atual.quantidade,
        unidade: mudanca.unidade ?? atual.unidade,
        sentido: mudanca.sentido ?? sentido,
      }),
    )

  return (
    <div className="space-y-2">
      <Label>{rotulo}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          className="w-20"
          value={atual.quantidade}
          onChange={(e) => emitir({ quantidade: Math.max(0, Number(e.target.value) || 0) })}
        />

        {unidades.length > 1 ? (
          <Select
            value={atual.unidade}
            onValueChange={(v) => emitir({ unidade: v as Unidade })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unidades.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">{unidades[0]}</span>
        )}

        {sentidos.length > 1 ? (
          <Select value={sentido} onValueChange={(v) => emitir({ sentido: v as Sentido })}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sentidos.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">{sentido}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Envia {descrever(minutos, ancora, unidades)}.
      </p>
    </div>
  )
}
