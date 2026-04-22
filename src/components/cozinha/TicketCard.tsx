'use client'

import { TicketCozinha, TipoPreparo, StatusTicketCozinha, PREP_TIPO_CONFIG } from '@/types'
import { minutesAgo, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ChefHat, Clock, User } from 'lucide-react'

interface TicketCardProps {
  ticket: TicketCozinha
  onAvancar: (ticket: TicketCozinha) => void
  loading?: boolean
}

const nextStatusLabel: Partial<Record<StatusTicketCozinha, string>> = {
  PENDENTE:   '✓ Pronto',
  EM_PREPARO: '✓ Pronto',
}

export function TicketCard({ ticket, onAvancar, loading }: TicketCardProps) {
  const minutos = minutesAgo(ticket.criado_em)
  const urgente = ticket.status === 'PENDENTE' && minutos >= 15
  const config = PREP_TIPO_CONFIG[ticket.tipo_preparo]

  const statusClass: Record<StatusTicketCozinha, string> = {
    PENDENTE:   'ticket-pendente',
    EM_PREPARO: 'ticket-em-preparo',
    PRONTO:     'ticket-pronto',
    CANCELADO:  'ticket-cancelado',
  }

  const nextLabel = nextStatusLabel[ticket.status]

  return (
    <div
      className={cn(
        'rounded-2xl p-4 bg-[var(--kitchen-surface)]',
        statusClass[ticket.status]
      )}
    >
      {/* Header — tipo preparo + mesa */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border',
            config.className
          )}
        >
          {config.emoji} {config.label.toUpperCase()}
        </span>
        <div className="flex items-center gap-1 text-[var(--kitchen-text)]">
          <span className="text-xs text-[var(--kitchen-muted)]">Mesa:</span>
          <span className="text-sm font-bold">{ticket.identificacao_mesa}</span>
        </div>
      </div>

      <div className="border-t border-[var(--kitchen-border)] my-3" />

      {/* Produto */}
      <div className="mb-3">
        <p className="text-lg font-extrabold text-[var(--kitchen-text)] leading-tight">
          {ticket.produto_nome}
        </p>
        <p className="text-3xl font-black text-[var(--p-orange)] tabular-nums mt-1">
          ×{ticket.quantidade}
        </p>
        {ticket.observacao && (
          <div className="mt-2 bg-[var(--p-orange-light)] text-[var(--p-orange-dark)] rounded-lg px-3 py-2 text-sm font-semibold">
            📝 {ticket.observacao}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--kitchen-border)] my-3" />

      {/* Footer — tempo + garçom */}
      <div className="flex items-center justify-between text-xs text-[var(--kitchen-muted)] mb-3">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span className={cn('font-semibold', urgente && 'text-[var(--danger)]')}>
            {urgente ? `⚠️ ${minutos} min` : `há ${minutos} min`}
          </span>
          <span className="opacity-50 ml-1">({formatTime(ticket.criado_em)})</span>
        </div>
        <div className="flex items-center gap-1">
          <User size={12} />
          <span>{ticket.garcom_nome}</span>
        </div>
      </div>

      {/* Botão de ação */}
      {nextLabel && (
        <button
          className={cn(
            'w-full min-h-[52px] rounded-xl font-bold text-base border-none cursor-pointer transition-all active:scale-95',
            'bg-[var(--success)] text-white hover:brightness-110',
            loading && 'opacity-60 cursor-not-allowed'
          )}
          onClick={() => onAvancar(ticket)}
          disabled={loading}
          aria-label={`${nextLabel} — ${ticket.produto_nome}`}
        >
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <ChefHat size={18} className="spinner" />
              Atualizando...
            </span>
          ) : nextLabel}
        </button>
      )}

      {ticket.status === 'PRONTO' && (
        <div className="w-full py-3 text-center text-[var(--success)] font-bold text-base">
          ✓ Pronto — aguardando garçom
        </div>
      )}
    </div>
  )
}

// ── Tab de filtro por tipo preparo ────────────────────────
interface PrepFilterTabProps {
  label: string
  emoji: string
  count: number
  active: boolean
  onClick: () => void
}

export function PrepFilterTab({ label, emoji, count, active, onClick }: PrepFilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap border',
        active
          ? 'bg-[var(--p-orange)] text-white border-transparent'
          : 'bg-[var(--kitchen-surface)] text-[var(--kitchen-muted)] border-[var(--kitchen-border)] hover:bg-[var(--kitchen-border)]'
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      {count > 0 && (
        <span
          className={cn(
            'ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold',
            active
              ? 'bg-white/30 text-white'
              : 'bg-[var(--danger)] text-white'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
