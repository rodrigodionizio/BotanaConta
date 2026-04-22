'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowLeft, TrendingUp, ShoppingBag, Receipt, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type Periodo = 'hoje' | '7d' | '30d'

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d',   label: '7 dias' },
  { value: '30d',  label: '30 dias' },
]

function calcularInicio(periodo: Periodo): Date {
  const d = new Date()
  if (periodo === 'hoje') {
    d.setHours(0, 0, 0, 0)
  } else if (periodo === '7d') {
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(d.getDate() - 29)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

interface ProdutoTop {
  nome: string
  quantidade: number
  total: number
}

export default function AdminRelatoriosPage() {
  const router = useRouter()
  const { estabelecimento, perfil: perfilAtual, isLoading: authLoading } = useAuthStore()
  const supabase = createClient()
  const [periodo, setPeriodo] = useState<Periodo>('hoje')

  // Guarda de perfil
  useEffect(() => {
    if (!authLoading && perfilAtual !== null && perfilAtual !== 'ADMIN') {
      router.replace(perfilAtual === 'COZINHA' ? '/cozinha' : '/mesas')
    }
  }, [authLoading, perfilAtual, router])

  // ── Stats do período ───────────────────────────────────
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['relatorio-stats', estabelecimento?.id, periodo],
    enabled: !!estabelecimento?.id,
    queryFn: async () => {
      const inicio = calcularInicio(periodo).toISOString()

      const { data: fechadas } = await supabase
        .from('comandas')
        .select('total_final, total_bruto, fechada_em, identificacao')
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('status', 'FECHADA')
        .gte('fechada_em', inicio)
        .order('fechada_em', { ascending: false })

      const lista = fechadas ?? []
      const faturamento = lista.reduce((acc, c) => acc + (c.total_final ?? 0), 0)
      const ticketMedio = lista.length > 0 ? faturamento / lista.length : 0

      return {
        faturamento,
        totalComandas: lista.length,
        ticketMedio,
        recentes: lista.slice(0, 10) as { total_final: number; fechada_em: string; identificacao: string }[],
      }
    },
  })

  // ── Top produtos ───────────────────────────────────────
  const { data: topProdutos = [], isLoading: loadingTop } = useQuery<ProdutoTop[]>({
    queryKey: ['relatorio-top', estabelecimento?.id, periodo],
    enabled: !!estabelecimento?.id,
    queryFn: async () => {
      const inicio = calcularInicio(periodo).toISOString()

      // Busca IDs das comandas fechadas no período
      const { data: comandas } = await supabase
        .from('comandas')
        .select('id')
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('status', 'FECHADA')
        .gte('fechada_em', inicio)

      if (!comandas || comandas.length === 0) return []

      const ids = comandas.map((c) => c.id)

      const { data: itens } = await supabase
        .from('comanda_itens')
        .select('produto_nome_snapshot, quantidade, subtotal')
        .in('comanda_id', ids)
        .eq('status', 'ATIVO')

      // Agrupamento client-side
      const mapa: Record<string, ProdutoTop> = {}
      for (const item of itens ?? []) {
        const nome = item.produto_nome_snapshot as string
        if (!mapa[nome]) mapa[nome] = { nome, quantidade: 0, total: 0 }
        mapa[nome].quantidade += item.quantidade as number
        mapa[nome].total += (item.subtotal as number) ?? 0
      }

      return Object.values(mapa)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 10)
    },
  })

  const isLoading = loadingStats || loadingTop

  return (
    <div className="min-h-dvh bg-[var(--bg-body)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-3 border-b border-[var(--s-gray-200)] sticky top-0 z-30 pt-safe">
        <button className="btn-ghost p-2" onClick={() => router.push('/admin')} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-extrabold text-lg flex-1">Relatórios</h1>
      </header>

      {/* Seletor de período */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--s-gray-200)] px-4 pb-3">
        <div className="flex gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-bold transition-colors',
                periodo === p.value
                  ? 'bg-[var(--p-orange)] text-white'
                  : 'bg-[var(--s-gray-100)] text-[var(--s-gray-500)]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Cards de stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Faturamento',
              value: loadingStats ? '—' : formatCurrency(stats?.faturamento ?? 0),
              icon: <TrendingUp size={16} />,
              cor: 'var(--success)',
            },
            {
              label: 'Comandas',
              value: loadingStats ? '—' : stats?.totalComandas ?? 0,
              icon: <Receipt size={16} />,
              cor: 'var(--info)',
            },
            {
              label: 'Ticket médio',
              value: loadingStats ? '—' : formatCurrency(stats?.ticketMedio ?? 0),
              icon: <ShoppingBag size={16} />,
              cor: 'var(--warning)',
            },
          ].map((c) => (
            <div key={c.label} className="card p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5" style={{ color: c.cor }}>
                {c.icon}
                <span className="text-xs font-semibold">{c.label}</span>
              </div>
              <p className="font-extrabold text-sm tabular-nums leading-tight">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Top produtos */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-[var(--warning)]" />
            <h2 className="font-bold text-sm">Mais pedidos</h2>
          </div>
          {loadingTop ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse bg-[var(--s-gray-100)] rounded-lg" />
            ))
          ) : topProdutos.length === 0 ? (
            <p className="text-xs text-[var(--s-gray-400)] py-2 text-center">Sem dados no período</p>
          ) : (
            <>
              {topProdutos.map((prod, i) => (
                <div key={prod.nome} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--s-gray-400)] w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{prod.nome}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums">{prod.quantidade}x</p>
                    <p className="text-xs text-[var(--s-gray-400)] tabular-nums">{formatCurrency(prod.total)}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Últimas comandas */}
        <div className="card p-4 flex flex-col gap-3">
          <h2 className="font-bold text-sm">Últimas comandas fechadas</h2>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse bg-[var(--s-gray-100)] rounded-lg" />
            ))
          ) : !stats?.recentes.length ? (
            <p className="text-xs text-[var(--s-gray-400)] py-2 text-center">Sem comandas fechadas no período</p>
          ) : (
            stats.recentes.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.identificacao}</p>
                  <p className="text-xs text-[var(--s-gray-400)]">{formatDateTime(c.fechada_em)}</p>
                </div>
                <p className="text-sm font-extrabold tabular-nums text-[var(--success)]">
                  {formatCurrency(c.total_final ?? 0)}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
