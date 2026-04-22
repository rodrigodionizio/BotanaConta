'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { TicketCozinha, StatusTicketCozinha } from '@/types'
import { timeAgo } from '@/lib/utils'

const STATUS_CONFIG: Record<StatusTicketCozinha, { label: string; color: string; bg: string; next?: StatusTicketCozinha; nextLabel?: string }> = {
  PENDENTE:   { label: 'Pendente',    color: 'text-[var(--warning)]',   bg: 'bg-[rgba(245,158,11,.12)]', next: 'EM_PREPARO', nextLabel: '▶ Iniciar' },
  EM_PREPARO: { label: 'Em preparo',  color: 'text-[var(--info)]',      bg: 'bg-[rgba(59,130,246,.12)]', next: 'PRONTO',     nextLabel: '✓ Pronto'  },
  PRONTO:     { label: 'Pronto',      color: 'text-[var(--success)]',   bg: 'bg-[rgba(16,185,129,.12)]' },
  CANCELADO:  { label: 'Cancelado',   color: 'text-[var(--danger)]',    bg: 'bg-[rgba(239,68,68,.12)]'  },
}

type FiltroStatus = StatusTicketCozinha | 'ATIVOS'

const FILTROS: { key: FiltroStatus; label: string }[] = [
  { key: 'ATIVOS',     label: 'Ativos' },
  { key: 'PENDENTE',   label: 'Pendente' },
  { key: 'EM_PREPARO', label: 'Em preparo' },
  { key: 'PRONTO',     label: 'Prontos' },
]

export default function CozinhaConfigPage() {
  const router             = useRouter()
  const { estabelecimento } = useAuthStore()
  const supabase           = createClient()
  const queryClient        = useQueryClient()
  const [filtro, setFiltro] = useState<FiltroStatus>('ATIVOS')

  // ── Fetch tickets ────────────────────────────────────
  const { data: tickets = [], isLoading } = useQuery<TicketCozinha[]>({
    queryKey: ['config-cozinha-tickets', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets_cozinha')
        .select('*')
        .eq('estabelecimento_id', estabelecimento!.id)
        .in('status', ['PENDENTE', 'EM_PREPARO', 'PRONTO'])
        .order('criado_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as TicketCozinha[]
    },
  })

  // ── Avançar status ───────────────────────────────────
  const avancarMutation = useMutation({
    mutationFn: async ({ id, novoStatus }: { id: string; novoStatus: StatusTicketCozinha }) => {
      const campo: Record<StatusTicketCozinha, { status: StatusTicketCozinha; iniciado_em?: string; concluido_em?: string; cancelado_em?: string }> = {
        EM_PREPARO: { status: 'EM_PREPARO', iniciado_em: new Date().toISOString() },
        PRONTO:     { status: 'PRONTO',     concluido_em: new Date().toISOString() },
        PENDENTE:   { status: 'PENDENTE' },
        CANCELADO:  { status: 'CANCELADO', cancelado_em: new Date().toISOString() },
      }
      const { error } = await supabase
        .from('tickets_cozinha')
        .update(campo[novoStatus])
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-cozinha-tickets', estabelecimento?.id] })
    },
  })

  // ── Filtrar ──────────────────────────────────────────
  const filtrados = filtro === 'ATIVOS'
    ? tickets.filter((t) => t.status !== 'PRONTO')
    : tickets.filter((t) => t.status === filtro)

  // Agrupar por garçom
  const porGarcom: Record<string, { garcom: string; tickets: TicketCozinha[] }> = {}
  filtrados.forEach((t) => {
    if (!porGarcom[t.garcom_nome]) {
      porGarcom[t.garcom_nome] = { garcom: t.garcom_nome, tickets: [] }
    }
    porGarcom[t.garcom_nome].tickets.push(t)
  })

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-body)]">

      {/* ── Header ───────────────────────────────────── */}
      <header className="bg-[var(--s-black)] px-5 py-4 shrink-0 pt-safe">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[var(--p-orange)] text-sm font-bold mb-3"
        >
          ← Voltar
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[var(--p-orange)]">🍳 Cozinha</h1>
            <p className="text-xs text-white/50 mt-1">Tickets por garçom</p>
          </div>
          <span className="text-xs font-bold text-white/40">
            {tickets.filter((t) => t.status !== 'PRONTO').length} ativos
          </span>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                filtro === f.key
                  ? 'bg-[var(--p-orange)] text-[var(--s-black)]'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="card h-20 animate-pulse bg-[var(--s-gray-100)]" />
            ))}
          </div>
        ) : Object.keys(porGarcom).length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-[var(--s-gray-400)]">
            <span className="text-5xl">🍳</span>
            <p className="font-semibold text-sm">Nenhum ticket encontrado</p>
          </div>
        ) : (
          Object.values(porGarcom).map(({ garcom, tickets: tks }) => (
            <section key={garcom}>
              <h2 className="text-sm font-extrabold text-[var(--s-black)] mb-2.5 flex items-center gap-2">
                <span>👤</span>
                <span>{garcom}</span>
                <span className="text-[10px] font-medium text-[var(--s-gray-400)]">
                  · {tks.length} {tks.length === 1 ? 'ticket' : 'tickets'}
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {tks.map((t) => {
                  const st = STATUS_CONFIG[t.status]
                  return (
                    <div key={t.id} className="card px-4 py-3 flex gap-3 items-start">
                      <div className={`rounded-xl px-2 py-1 shrink-0 ${st.bg}`}>
                        <p className={`text-[10px] font-extrabold ${st.color}`}>{st.label}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--s-black)] truncate">
                          {t.produto_nome}
                        </p>
                        <p className="text-[10px] text-[var(--s-gray-400)]">
                          {t.identificacao_mesa} · {t.quantidade}x · {timeAgo(t.criado_em)}
                        </p>
                        {t.observacao && (
                          <p className="text-[10px] italic text-[var(--s-gray-400)] mt-0.5">
                            "{t.observacao}"
                          </p>
                        )}
                      </div>
                      {st.next && (
                        <button
                          disabled={avancarMutation.isPending}
                          onClick={() => avancarMutation.mutate({ id: t.id, novoStatus: st.next! })}
                          className="shrink-0 rounded-xl px-3 py-2 bg-[var(--p-orange)] text-white text-[11px] font-extrabold disabled:opacity-50 active:scale-95 transition-transform"
                        >
                          {st.nextLabel}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
