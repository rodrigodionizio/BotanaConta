'use client'

import { Comanda, StatusComanda } from '@/types'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Config de status ─────────────────────────────────────────
const statusConfig: Record<StatusComanda, {
  label: string
  icon: string
  borderColor: string
  badgeClass: string
}> = {
  ATIVA:        { label: 'Ocupada',      icon: '🍢', borderColor: 'var(--status-ativa)',        badgeClass: 'badge-orange' },
  CONTA_PEDIDA: { label: 'Conta pedida', icon: '🧾', borderColor: 'var(--status-conta-pedida)', badgeClass: 'badge-danger' },
  FECHADA:      { label: 'Fechada',      icon: '✅', borderColor: 'var(--status-pronta)',        badgeClass: 'badge-success' },
  CANCELADA:    { label: 'Cancelada',    icon: '❌', borderColor: 'var(--status-livre)',         badgeClass: 'badge-gray' },
}

// ── Card compacto para grid 3 colunas (tela principal de mesas) ──
interface MesaGridCardProps {
  nome: string
  comanda?: Comanda
  onClick: () => void
}

export function MesaGridCard({ nome, comanda, onClick }: MesaGridCardProps) {
  if (!comanda) {
    // Mesa livre
    return (
      <button
        className="card flex flex-col items-center justify-center gap-1 py-3 px-1 cursor-pointer border-2 border-dashed border-[var(--s-gray-200)] bg-transparent shadow-none active:scale-95 transition-transform"
        onClick={onClick}
        aria-label={`Mesa livre — ${nome}`}
      >
        <span className="text-2xl">🪑</span>
        <p className="text-xs font-extrabold text-[var(--s-black)] truncate max-w-full px-1">{nome}</p>
        <p className="text-[10px] text-[var(--s-gray-400)] font-medium">Livre</p>
      </button>
    )
  }

  const config = statusConfig[comanda.status]
  const itensAtivos = comanda.itens?.filter((i) => i.status === 'ATIVO') ?? []

  return (
    <button
      className={cn(
        'card flex flex-col items-center justify-center gap-1 py-3 px-1 cursor-pointer border-2 active:scale-95 transition-transform',
        comanda.status === 'CONTA_PEDIDA' && 'animate-pulse-border'
      )}
      style={{ borderColor: config.borderColor }}
      onClick={onClick}
      aria-label={`${nome} — ${config.label}`}
    >
      <span className="text-2xl">{config.icon}</span>
      <p className="text-xs font-extrabold text-[var(--s-black)] truncate max-w-full px-1">{nome}</p>
      <p className="text-[10px] font-medium" style={{ color: config.borderColor }}>{config.label}</p>
      {comanda.total_bruto > 0 && (
        <p className="text-[10px] font-extrabold text-[var(--p-orange)] tabular-nums">
          {formatCurrency(comanda.total_bruto)}
        </p>
      )}
    </button>
  )
}

// ── Card "+ Nova comanda" para o fim do grid ─────────────────
export function MesaGridNova({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="card flex flex-col items-center justify-center gap-1 py-3 px-1 cursor-pointer border-2 border-dashed border-[var(--s-gray-200)] bg-transparent shadow-none active:scale-95 transition-transform"
      onClick={onClick}
      aria-label="Nova comanda"
    >
      <span className="text-2xl text-[var(--s-gray-400)]">+</span>
      <p className="text-[10px] text-[var(--s-gray-400)] font-semibold">Nova</p>
    </button>
  )
}

// ── Row de pedido ativo (seção "Pedidos em aberto") ──────────
interface AorderRowProps {
  comanda: Comanda
  onClick: () => void
}

export function AorderRow({ comanda, onClick }: AorderRowProps) {
  const isContaPedida = comanda.status === 'CONTA_PEDIDA'
  const itensAtivos = comanda.itens?.filter((i) => i.status === 'ATIVO') ?? []
  const itensCount = itensAtivos.length

  return (
    <button
      className="card w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left active:scale-[0.99] transition-transform"
      onClick={onClick}
      aria-label={`Comanda ${comanda.identificacao}`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: isContaPedida ? 'var(--danger)' : 'var(--p-orange)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--s-black)] truncate">{comanda.identificacao}</p>
        <p className="text-[10px] text-[var(--s-gray-400)]">
          {timeAgo(comanda.aberta_em)} · {itensCount} {itensCount === 1 ? 'item' : 'itens'}
        </p>
      </div>
      <p className="text-base font-extrabold text-[var(--s-black)] tabular-nums shrink-0">
        {formatCurrency(comanda.total_bruto)}
      </p>
      <span className="text-[var(--s-gray-400)] text-sm font-bold">›</span>
    </button>
  )
}

// ── Legacy cards (mantidos para compatibilidade) ─────────────
interface MesaCardProps {
  comanda: Comanda
  onClick: (comanda: Comanda) => void
}

export function MesaCard({ comanda, onClick }: MesaCardProps) {
  const config = statusConfig[comanda.status]
  const itensAtivos = comanda.itens?.filter((i) => i.status === 'ATIVO') ?? []
  const itensCount = itensAtivos.length

  return (
    <button
      className={cn('card w-full text-left p-4 cursor-pointer border-l-4')}
      style={{ borderLeftColor: config.borderColor }}
      onClick={() => onClick(comanda)}
      aria-label={`Comanda ${comanda.identificacao} — ${config.label}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-base leading-tight truncate text-[var(--s-black)]">
          {comanda.identificacao}
        </h3>
        <span className={cn('badge shrink-0', config.badgeClass)}>{config.label}</span>
      </div>
      <p className="text-xl font-extrabold text-[var(--s-black)] mb-2 tabular-nums">
        {formatCurrency(comanda.total_bruto)}
      </p>
      <p className="text-xs text-[var(--s-gray-400)]">
        {itensCount} {itensCount === 1 ? 'item' : 'itens'} · {timeAgo(comanda.aberta_em)}
      </p>
    </button>
  )
}

export function MesaCardLivre({ nome, onClick }: { nome?: string; onClick: () => void }) {
  return (
    <button
      className="card w-full text-left p-4 cursor-pointer border-dashed border-2 border-[var(--s-gray-200)] bg-transparent shadow-none"
      onClick={onClick}
      aria-label={nome ? `Abrir comanda — ${nome}` : 'Nova comanda'}
    >
      <div className="flex flex-col items-center justify-center gap-2 py-2 text-[var(--s-gray-400)]">
        <span className="text-3xl">+</span>
        {nome && <p className="text-xs font-semibold uppercase tracking-wide">{nome}</p>}
        {!nome && <p className="text-xs font-medium">Nova comanda</p>}
      </div>
    </button>
  )
}
