'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Package, Users, UtensilsCrossed,
  BarChart3, Settings, ChefHat, TrendingUp
} from 'lucide-react'

interface Stat { label: string; value: string | number; sub?: string }

export default function AdminPage() {
  const router = useRouter()
  const { estabelecimento, user } = useAuthStore()
  const supabase = createClient()

  // ── Stats do dia ─────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['admin-stats', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fechadasRaw } = await (supabase.from('comandas') as any)
        .select('total_final, total_bruto')
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('status', 'FECHADA')
        .gte('fechada_em', hoje.toISOString())
      const fechadas = fechadasRaw as { total_final: number | null; total_bruto: number | null }[] | null

      const { count: abertas } = await supabase
        .from('comandas')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimento!.id)
        .in('status', ['ATIVA', 'CONTA_PEDIDA'])

      const { count: produtos } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('disponivel', true)

      const faturamento = (fechadas ?? []).reduce(
        (acc, c) => acc + (c.total_final ?? 0),
        0
      )
      const ticketMedio =
        fechadas && fechadas.length > 0 ? faturamento / fechadas.length : 0

      return {
        faturamento,
        comandasFechadas: fechadas?.length ?? 0,
        comandasAbertas: abertas ?? 0,
        ticketMedio,
        produtosAtivos: produtos ?? 0,
      }
    },
  })

  const menuItems = [
    {
      icon: <Package size={24} />,
      label: 'Cardápio',
      desc: `${stats?.produtosAtivos ?? 0} produtos ativos`,
      onClick: () => router.push('/admin/cardapio'),
      color: 'var(--p-orange)',
    },
    {
      icon: <UtensilsCrossed size={24} />,
      label: 'Mesas',
      desc: 'Gerenciar identificadores',
      onClick: () => router.push('/admin/mesas'),
      color: 'var(--info)',
    },
    {
      icon: <Users size={24} />,
      label: 'Usuários',
      desc: 'Garçons e cozinha',
      onClick: () => router.push('/admin/usuarios'),
      color: 'var(--success)',
    },
    {
      icon: <BarChart3 size={24} />,
      label: 'Relatórios',
      desc: 'Faturamento e análises',
      onClick: () => router.push('/admin/relatorios'),
      color: 'var(--warning)',
    },
    {
      icon: <ChefHat size={24} />,
      label: 'Cozinha',
      desc: 'Ver fila de preparo',
      onClick: () => router.push('/cozinha'),
      color: '#8B5CF6',
    },
    {
      icon: <Settings size={24} />,
      label: 'Configurações',
      desc: 'Taxa, impressora, alertas',
      onClick: () => router.push('/admin/configuracoes'),
      color: 'var(--s-gray-600)',
    },
  ]

  return (
    <div className="min-h-dvh bg-[var(--bg-body)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-3 border-b border-[var(--s-gray-200)] sticky top-0 z-30 pt-safe">
        <button className="btn-ghost p-2" onClick={() => router.push('/mesas')} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">Painel Admin</h1>
          <p className="text-xs text-[var(--s-gray-400)]">{estabelecimento?.nome}</p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Faturamento hoje',
              value: formatCurrency(stats?.faturamento ?? 0),
              icon: <TrendingUp size={18} className="text-[var(--success)]" />,
            },
            {
              label: 'Comandas fechadas',
              value: stats?.comandasFechadas ?? 0,
              icon: <Package size={18} className="text-[var(--s-gray-400)]" />,
            },
            {
              label: 'Ticket médio',
              value: formatCurrency(stats?.ticketMedio ?? 0),
              icon: <BarChart3 size={18} className="text-[var(--info)]" />,
            },
            {
              label: 'Mesas abertas',
              value: stats?.comandasAbertas ?? 0,
              icon: <UtensilsCrossed size={18} className="text-[var(--p-orange)]" />,
            },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-[var(--s-gray-400)] font-medium">{stat.label}</p>
                {stat.icon}
              </div>
              <p className="text-xl font-extrabold text-[var(--s-black)] tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Menu de navegação */}
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="card p-4 text-left flex flex-col gap-3 active:scale-95 transition-transform"
              onClick={item.onClick}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                style={{ background: item.color }}
              >
                {item.icon}
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--s-black)]">{item.label}</p>
                <p className="text-xs text-[var(--s-gray-400)] mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
