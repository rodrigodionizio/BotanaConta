'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TicketCard, PrepFilterTab } from '@/components/cozinha/TicketCard'
import { TicketCozinha, TipoPreparo, StatusTicketCozinha, PREP_TIPO_CONFIG } from '@/types'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ChefHat, ArrowLeft } from 'lucide-react'

type FiltroTab = 'TODOS' | TipoPreparo

const TABS: { key: FiltroTab; label: string; emoji: string }[] = [
  { key: 'TODOS',    label: 'Todos',    emoji: '📋' },
  { key: 'ASSAR',    label: 'Assar',    emoji: PREP_TIPO_CONFIG.ASSAR.emoji },
  { key: 'FRITAR',   label: 'Fritar',   emoji: PREP_TIPO_CONFIG.FRITAR.emoji },
  { key: 'COZINHAR', label: 'Cozinhar', emoji: PREP_TIPO_CONFIG.COZINHAR.emoji },
  { key: 'ESQUENTAR',label: 'Esquentar',emoji: PREP_TIPO_CONFIG.ESQUENTAR.emoji },
  { key: 'MONTAR',   label: 'Montar',   emoji: PREP_TIPO_CONFIG.MONTAR.emoji },
]

const NEXT_STATUS: Record<StatusTicketCozinha, StatusTicketCozinha | null> = {
  PENDENTE:   'EM_PREPARO',
  EM_PREPARO: 'PRONTO',
  PRONTO:     null,
  CANCELADO:  null,
}

export default function CozinhaPage() {
  const [filtro, setFiltro] = useState<FiltroTab>('TODOS')
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const { estabelecimento } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  // ── Fetch tickets ────────────────────────────────────
  const { data: tickets = [], isLoading } = useQuery<TicketCozinha[]>({
    queryKey: ['tickets', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    refetchInterval: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets_cozinha')
        .select('*')
        .eq('estabelecimento_id', estabelecimento!.id)
        .in('status', ['PENDENTE', 'EM_PREPARO', 'PRONTO'])
        .order('criado_em', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  // ── Realtime ─────────────────────────────────────────
  useEffect(() => {
    if (!estabelecimento?.id) return

    const channel = supabase
      .channel('cozinha-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets_cozinha',
          filter: `estabelecimento_id=eq.${estabelecimento.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['tickets'] })
          // Alerta sonoro
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
            osc.start()
            osc.stop(ctx.currentTime + 0.3)
          } catch {}
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [estabelecimento?.id, qc, supabase])

  // ── Avançar status ───────────────────────────────────
  const avancarStatus = async (ticket: TicketCozinha) => {
    const nextStatus = NEXT_STATUS[ticket.status]
    if (!nextStatus) return

    setAtualizando(ticket.id)
    try {
      const updateData: Record<string, string> = {
        status: nextStatus,
        ...(nextStatus === 'EM_PREPARO' && { iniciado_em: new Date().toISOString() }),
        ...(nextStatus === 'PRONTO'     && { concluido_em: new Date().toISOString() }),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tickets_cozinha') as any)
        .update(updateData)
        .eq('id', ticket.id)

      if (error) throw error
      qc.invalidateQueries({ queryKey: ['tickets'] })

      if (nextStatus === 'PRONTO') {
        toast.success(`✓ ${ticket.produto_nome} pronto!`)
      }
    } catch {
      toast.error('Erro ao atualizar ticket')
    } finally {
      setAtualizando(null)
    }
  }

  // ── Filtrar tickets ──────────────────────────────────
  const ticketsFiltrados =
    filtro === 'TODOS'
      ? tickets
      : tickets.filter((t) => t.tipo_preparo === filtro)

  const countPorTipo = (tipo: TipoPreparo) =>
    tickets.filter((t) => t.tipo_preparo === tipo && t.status === 'PENDENTE').length

  const totalPendentes = tickets.filter((t) => t.status === 'PENDENTE').length

  return (
    <div className="kitchen-mode min-h-dvh flex flex-col">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--kitchen-border)] sticky top-0 z-30 pt-safe"
        style={{ background: 'var(--kitchen-surface)' }}
      >
        <div className="flex items-center gap-3">
          <button
            className="btn-ghost p-2 text-[var(--kitchen-muted)]"
            onClick={() => router.back()}
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <ChefHat size={22} className="text-[var(--p-orange)]" />
            <h1 className="text-lg font-extrabold text-[var(--kitchen-text)]">Cozinha</h1>
          </div>
        </div>

        {totalPendentes > 0 && (
          <div className="flex items-center gap-2 bg-[var(--danger)] text-white px-3 py-1.5 rounded-xl">
            <span className="text-sm font-bold">{totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}</span>
          </div>
        )}
      </header>

      {/* Filtros por tipo de preparo */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-[var(--kitchen-border)]">
        {TABS.map((tab) => (
          <PrepFilterTab
            key={tab.key}
            label={tab.label}
            emoji={tab.emoji}
            count={tab.key !== 'TODOS' ? countPorTipo(tab.key as TipoPreparo) : totalPendentes}
            active={filtro === tab.key}
            onClick={() => setFiltro(tab.key)}
          />
        ))}
      </div>

      {/* Grid de tickets */}
      <main className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-2xl animate-pulse"
                style={{ background: 'var(--kitchen-surface)' }}
              />
            ))}
          </div>
        ) : ticketsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-[var(--kitchen-muted)]">
            <ChefHat size={60} strokeWidth={1} />
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--kitchen-text)]">Fila vazia!</p>
              <p className="text-sm">Nenhum pedido pendente no momento.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ticketsFiltrados.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onAvancar={avancarStatus}
                loading={atualizando === ticket.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
