'use client'

import { ComandaItem, StatusTicketCozinha } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { ProductImage } from '@/components/ui/ProductImage'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComandaItemCardProps {
  item: ComandaItem
  onIncrement: (item: ComandaItem) => void
  onDecrement: (item: ComandaItem) => void
  onRemover: (item: ComandaItem) => void
  canEdit: boolean
}

const ticketStatusLabel: Record<StatusTicketCozinha, { label: string; color: string }> = {
  PENDENTE:    { label: 'Aguardando cozinha', color: 'text-[var(--s-gray-400)]' },
  EM_PREPARO:  { label: 'Em preparo',         color: 'text-[var(--warning)]' },
  PRONTO:      { label: '✓ Pronto!',          color: 'text-[var(--success)]' },
  CANCELADO:   { label: 'Cancelado',          color: 'text-[var(--danger)]' },
}

export function ComandaItemCard({
  item,
  onIncrement,
  onDecrement,
  onRemover,
  canEdit,
}: ComandaItemCardProps) {
  const ticketStatus = item.ticket?.status
  const bloqueado = ticketStatus && ticketStatus !== 'PENDENTE' && ticketStatus !== 'CANCELADO'

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3 border-b border-[var(--s-gray-200)] last:border-0',
        item.status === 'REMOVIDO' && 'opacity-40 line-through'
      )}
    >
      {/* Thumbnail */}
      <ProductImage
        src={item.produto?.foto_principal?.url_thumbnail}
        alt={item.produto_nome_snapshot}
        size="thumb"
        className="rounded-xl"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight text-[var(--s-black)] truncate">
          {item.produto_nome_snapshot}
        </p>
        {item.observacao && (
          <p className="text-xs text-[var(--s-gray-400)] mt-0.5 truncate">
            📝 {item.observacao}
          </p>
        )}
        {ticketStatus && (
          <p className={cn('text-xs mt-0.5 font-medium', ticketStatusLabel[ticketStatus].color)}>
            {ticketStatusLabel[ticketStatus].label}
          </p>
        )}
        <p className="text-sm font-bold text-[var(--s-black)] mt-1 tabular-nums">
          {formatCurrency(item.subtotal)}
          <span className="font-normal text-[var(--s-gray-400)] ml-1 text-xs">
            ({formatCurrency(item.preco_unitario_snapshot)} × {item.quantidade})
          </span>
        </p>
      </div>

      {/* Controles de quantidade */}
      {canEdit && !bloqueado && (
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              item.quantidade <= 1 ? onRemover(item) : onDecrement(item)
            }
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--s-gray-600)] hover:bg-[var(--s-gray-100)] transition-colors"
            aria-label="Diminuir"
          >
            {item.quantidade <= 1 ? <Trash2 size={15} className="text-[var(--danger)]" /> : <Minus size={15} />}
          </button>
          <span className="text-sm font-bold w-6 text-center tabular-nums">
            {item.quantidade}
          </span>
          <button
            onClick={() => onIncrement(item)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--s-gray-600)] hover:bg-[var(--s-gray-100)] transition-colors"
            aria-label="Aumentar"
          >
            <Plus size={15} />
          </button>
        </div>
      )}

      {/* Quantidade bloqueada (em preparo) */}
      {(bloqueado || !canEdit) && (
        <span className="text-sm font-bold text-[var(--s-gray-600)] w-10 text-right tabular-nums">
          ×{item.quantidade}
        </span>
      )}
    </div>
  )
}
