'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/BottomNav'
import { useAuthStore } from '@/store/auth'
import { Comanda } from '@/types'
import { formatCurrency, formatTime } from '@/lib/utils'

type Periodo = 'hoje' | '7d' | '30d'

const PERIODO_CONFIG: Record<Periodo, { label: string; tag: string; dias: number }> = {
  hoje: { label: 'hoje',   tag: 'Hoje',     dias: 0  },
  '7d': { label: '7 dias', tag: '7 dias',   dias: 7  },
  '30d':{ label: '30 dias',tag: '30 dias',  dias: 30 },
}

export default function HistoricoPage() {
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const { estabelecimento } = useAuthStore()
  const supabase = createClient()

  // ── Intervalo de datas ───────────────────────────────
  const getInicio = (p: Periodo) => {
    const d = new Date()
    if (p === 'hoje') d.setHours(0, 0, 0, 0)
    else d.setDate(d.getDate() - PERIODO_CONFIG[p].dias)
    return d.toISOString()
  }

  // ── Fetch comandas do período ────────────────────────
  const { data: comandas = [], isLoading } = useQuery<Comanda[]>({
    queryKey: ['historico', estabelecimento?.id, periodo],
    enabled: !!estabelecimento?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const inicio = getInicio(periodo)
      const { data, error } = await supabase
        .from('comandas')
        .select(`
          id, identificacao, status, total_bruto, total_final,
          taxa_servico_valor, aberta_em, fechada_em,
          itens: comanda_itens(id, quantidade, produto_nome_snapshot, subtotal, status)
        `)
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('status', 'FECHADA')
        .gte('fechada_em', inicio)
        .order('fechada_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Comanda[]
    },
  })

  // ── Stats calculados ─────────────────────────────────
  const faturamento  = comandas.reduce((acc, c) => acc + (c.total_final ?? c.total_bruto ?? 0), 0)
  const totalComandas = comandas.length
  const ticketMedio  = totalComandas > 0 ? faturamento / totalComandas : 0

  // ── Top produtos do período ─────────────────────────
  const prodContagem: Record<string, { nome: string; qty: number; total: number }> = {}
  comandas.forEach((c) => {
    c.itens
      ?.filter((i) => i.status === 'ATIVO')
      .forEach((i) => {
        if (!prodContagem[i.produto_nome_snapshot]) {
          prodContagem[i.produto_nome_snapshot] = { nome: i.produto_nome_snapshot, qty: 0, total: 0 }
        }
        prodContagem[i.produto_nome_snapshot].qty   += i.quantidade
        prodContagem[i.produto_nome_snapshot].total += i.subtotal
      })
  })
  const topProdutos = Object.values(prodContagem)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-body)]">

      {/* ── Header ───────────────────────────────────── */}
      <header className="bg-[var(--s-black)] px-5 py-4 shrink-0 pt-safe">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[var(--p-orange)] flex items-center gap-2">
              📋 Histórico
            </h1>
            <p className="text-xs text-white/50 mt-1">Comandas fechadas</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--p-orange)] text-[var(--s-black)]">
            {PERIODO_CONFIG[periodo].tag}
          </span>
        </div>

        {/* Seletor de período */}
        <div className="flex gap-2 mt-3">
          {(Object.keys(PERIODO_CONFIG) as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                periodo === p
                  ? 'bg-[var(--p-orange)] text-[var(--s-black)]'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {PERIODO_CONFIG[p].tag}
            </button>
          ))}
        </div>
      </header>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { val: formatCurrency(faturamento), label: 'Faturamento',      color: 'var(--success)' },
            { val: totalComandas,               label: 'Comandas',          color: 'var(--s-black)' },
            { val: formatCurrency(ticketMedio), label: 'Faturamento médio', color: 'var(--info)' },
          ].map((s) => (
            <div key={s.label} className="card py-3 px-2 text-center">
              <p className="text-lg font-black leading-tight" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-[var(--s-gray-400)] font-medium mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Top produtos */}
        {topProdutos.length > 0 && (
          <section>
            <h2 className="text-sm font-extrabold text-[var(--s-black)] mb-2.5">
              🏆 Mais vendidos
            </h2>
            <div className="card overflow-hidden">
              {topProdutos.map((p, i) => (
                <div
                  key={p.nome}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[var(--s-gray-200)] last:border-0"
                >
                  <span className="text-sm font-black text-[var(--s-gray-400)] w-5 text-center">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--s-black)] truncate">{p.nome}</p>
                    <p className="text-[10px] text-[var(--s-gray-400)]">{p.qty} unidades</p>
                  </div>
                  <p className="text-sm font-extrabold text-[var(--p-orange)] tabular-nums">
                    {formatCurrency(p.total)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lista de comandas */}
        <section>
          <h2 className="text-sm font-extrabold text-[var(--s-black)] mb-2.5">
            Comandas de {PERIODO_CONFIG[periodo].label}
          </h2>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-16 animate-pulse bg-[var(--s-gray-100)]" />
              ))}
            </div>
          ) : comandas.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-[var(--s-gray-400)]">
              <span className="text-5xl">📋</span>
              <p className="font-semibold text-sm">Nenhuma comanda fechada</p>
              <p className="text-xs text-center">
                {periodo === 'hoje' ? 'Nenhuma comanda foi encerrada hoje.' : `Não há comandas nos últimos ${PERIODO_CONFIG[periodo].label}.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {comandas.map((c) => {
                const itensAtivos = c.itens?.filter((i) => i.status === 'ATIVO') ?? []
                const hora = c.fechada_em ? formatTime(c.fechada_em) : '--'
                return (
                  <div key={c.id} className="card flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl">🍢</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--s-black)] truncate">
                        {c.identificacao}
                      </p>
                      <p className="text-[10px] text-[var(--s-gray-400)]">
                        Fechada às {hora} · {itensAtivos.length} {itensAtivos.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <p className="text-base font-extrabold text-[var(--success)] tabular-nums shrink-0">
                      {formatCurrency(c.total_final ?? c.total_bruto ?? 0)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
