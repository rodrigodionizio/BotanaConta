'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Comanda, FormaPagamento, FORMA_PAGAMENTO_LABEL } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Drawer } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

const FORMAS: { value: FormaPagamento; emoji: string }[] = [
  { value: 'PIX',            emoji: '📱' },
  { value: 'DINHEIRO',       emoji: '💵' },
  { value: 'CARTAO_CREDITO', emoji: '💳' },
  { value: 'CARTAO_DEBITO',  emoji: '🏦' },
  { value: 'VOUCHER',        emoji: '🎫' },
  { value: 'CORTESIA',       emoji: '🎁' },
]

interface PaymentSheetProps {
  open: boolean
  onClose: () => void
  comanda: Comanda
}

export function PaymentSheet({ open, onClose, comanda }: PaymentSheetProps) {
  const { user, configuracoes } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  const taxaAtiva = configuracoes?.taxa_servico_ativa ?? false
  const totalFinal = comanda.total_final ?? comanda.total_bruto

  const [forma, setForma] = useState<FormaPagamento>('PIX')
  const [valorStr, setValorStr] = useState('')
  const [trocoStr, setTrocoStr] = useState('')

  // Reinicia campos quando o sheet abre
  useEffect(() => {
    if (open) {
      setForma('PIX')
      setValorStr(totalFinal.toFixed(2).replace('.', ','))
      setTrocoStr('')
    }
  }, [open, totalFinal])

  // Calcula troco automaticamente para DINHEIRO
  useEffect(() => {
    if (forma === 'DINHEIRO') {
      const valorNum = parseFloat(valorStr.replace(',', '.')) || 0
      const troco = valorNum - totalFinal
      setTrocoStr(troco > 0 ? troco.toFixed(2).replace('.', ',') : '0,00')
    }
  }, [valorStr, forma, totalFinal])

  const registrarPagamento = useMutation({
    mutationFn: async () => {
      const valor = parseFloat(valorStr.replace(',', '.'))
      if (isNaN(valor) || valor <= 0) throw new Error('Informe um valor válido')

      const troco = forma === 'DINHEIRO'
        ? Math.max(0, parseFloat(valorStr.replace(',', '.')) - totalFinal)
        : null

      const { error: errPag } = await supabase.from('pagamentos').insert({
        comanda_id: comanda.id,
        forma,
        valor,
        troco: troco !== null ? troco : null,
        registrado_por: user!.id,
      })
      if (errPag) throw errPag

      const { error: errCom } = await supabase
        .from('comandas')
        .update({ status: 'FECHADA', fechada_em: new Date().toISOString() })
        .eq('id', comanda.id)
      if (errCom) throw errCom
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comanda', comanda.id] })
      qc.invalidateQueries({ queryKey: ['comandas'] })
      toast.success(`${comanda.identificacao} — fechada! ✓`)
      onClose()
      router.push('/mesas')
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao registrar pagamento'),
  })

  return (
    <Drawer open={open} onClose={onClose} title="Registrar Pagamento">
      <div className="p-5 flex flex-col gap-5 pb-safe overflow-y-auto max-h-[85dvh]">

        {/* Resumo financeiro */}
        <div className="rounded-2xl bg-[var(--s-gray-50)] border border-[var(--s-gray-200)] p-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-[var(--s-gray-400)] uppercase tracking-wide mb-1">
            Resumo — {comanda.identificacao}
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--s-gray-600)]">Subtotal</span>
            <span className="font-semibold tabular-nums">{formatCurrency(comanda.total_bruto)}</span>
          </div>
          {taxaAtiva && comanda.taxa_servico_valor > 0 && (
            <div className="flex justify-between text-sm border-t border-[var(--s-gray-200)] pt-2">
              <span className="text-[var(--s-gray-600)]">
                Taxa de serviço ({comanda.taxa_servico_pct}%)
              </span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(comanda.taxa_servico_valor)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[var(--s-gray-200)]">
            <span className="font-extrabold text-base">Total</span>
            <span className="font-black text-xl text-[var(--p-orange)] tabular-nums">
              {formatCurrency(totalFinal)}
            </span>
          </div>
        </div>

        {/* Seletor de forma de pagamento */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Forma de pagamento</p>
          <div className="grid grid-cols-3 gap-2">
            {FORMAS.map(({ value, emoji }) => (
              <button
                key={value}
                onClick={() => setForma(value)}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-bold transition-colors',
                  forma === value
                    ? 'border-[var(--p-orange)] bg-[var(--p-orange-light)] text-[var(--p-orange-dark)]'
                    : 'border-[var(--s-gray-200)] text-[var(--s-gray-600)]'
                )}
              >
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-center leading-tight">
                  {FORMA_PAGAMENTO_LABEL[value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Campo de valor */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            {forma === 'DINHEIRO' ? 'Valor recebido (R$)' : 'Valor cobrado (R$)'}
          </label>
          <input
            className="input text-right text-lg font-bold tabular-nums"
            inputMode="decimal"
            value={valorStr}
            onChange={(e) => setValorStr(e.target.value)}
            placeholder="0,00"
          />
        </div>

        {/* Troco (apenas DINHEIRO) */}
        {forma === 'DINHEIRO' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
              Troco
            </label>
            <div
              className="input font-bold tabular-nums text-right text-lg"
              style={{ background: 'var(--success-light)', color: '#059669' }}
            >
              R$ {trocoStr}
            </div>
          </div>
        )}

        {/* Botão confirmar */}
        <button
          className="w-full min-h-[56px] rounded-xl font-black text-base flex items-center justify-center gap-2 text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'var(--success)' }}
          onClick={() => registrarPagamento.mutate()}
          disabled={registrarPagamento.isPending}
        >
          {registrarPagamento.isPending ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spinner" />
          ) : (
            <>
              <CheckCircle size={22} />
              Confirmar e fechar mesa
            </>
          )}
        </button>
      </div>
    </Drawer>
  )
}
