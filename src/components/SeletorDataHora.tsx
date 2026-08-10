import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HORARIOS_DISPONIVEIS, TURNOS_DE_ATENDIMENTO } from '@/lib/appointment-time'

interface Props {
  /** Formato 'AAAA-MM-DDTHH:mm' — o mesmo do datetime-local que havia antes. */
  value: string
  onChange: (valor: string) => void
  /** Bloqueia datas passadas (agendar) ou futuras (registrar consulta antiga). */
  min?: string
  max?: string
}

/**
 * Data + horário da consulta, em dois campos.
 *
 * Substitui o `datetime-local`: aquele campo deixa digitar qualquer minuto e
 * não sabe pular o intervalo do meio-dia. Aqui a lista só oferece o que a
 * clínica atende, separada por turno — o buraco entre 11:30 e 13:30 fica
 * visível em vez de ser uma regra escondida que só aparece no erro.
 */
export function SeletorDataHora({ value, onChange, min, max }: Props) {
  const [dia, setDia] = useState(value ? value.slice(0, 10) : '')
  const [hora, setHora] = useState(value ? value.slice(11, 16) : '')

  // Quando o formulário é limpo depois de salvar, os dois campos acompanham.
  // Só reage ao esvaziamento: sincronizar sempre brigaria com quem está
  // preenchendo — ao escolher a data, o valor combinado ainda é vazio.
  useEffect(() => {
    if (!value && (dia || hora)) {
      setDia('')
      setHora('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emitir = (novoDia: string, novaHora: string) => {
    setDia(novoDia)
    setHora(novaHora)
    onChange(novoDia && novaHora ? `${novoDia}T${novaHora}` : '')
  }

  // Horário salvo fora da grade (consulta antiga, de antes desta regra):
  // aparece na lista para não sumir da tela ao abrir o registro.
  const foraDaGrade = hora && !HORARIOS_DISPONIVEIS.includes(hora) ? hora : null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Input
        type="date"
        value={dia}
        min={min}
        max={max}
        onChange={(e) => emitir(e.target.value, hora)}
        onClick={(ev) => {
          const el = ev.currentTarget as HTMLInputElement & { showPicker?: () => void }
          try {
            el.showPicker?.()
          } catch {
            /* navegador sem suporte: o ícone nativo continua funcionando */
          }
        }}
        className="cursor-pointer"
      />
      <Select value={hora} onValueChange={(h) => emitir(dia, h)}>
        <SelectTrigger>
          <SelectValue placeholder="Horário" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {foraDaGrade && (
            <SelectGroup>
              <SelectLabel>Fora do horário de atendimento</SelectLabel>
              <SelectItem value={foraDaGrade}>{foraDaGrade}</SelectItem>
            </SelectGroup>
          )}
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
    </div>
  )
}
