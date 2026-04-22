'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { MesaGridCard, MesaGridNova, AorderRow } from '@/components/garcom/MesaCard'
import { NovaComandaDrawer } from '@/components/garcom/NovaComandaDrawer'
import { OfflineBadge } from '@/components/ui/OfflineBadge'
import { BottomNav } from '@/components/ui/BottomNav'
import { useAuthStore } from '@/store/auth'
import { Comanda, MesaPreset, StatusComanda } from '@/types'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { LogoMark } from '@/components/ui/Logo'

const STATUS_ORDER: Record<StatusComanda, number> = {
  CONTA_PEDIDA: 0,
  ATIVA:        1,
  FECHADA:      2,
  CANCELADA:    3,
}

export default function MesasPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mesaPreSelected, setMesaPreSelected] = useState('')
  const { user, estabelecimento } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  // ── Fetch comandas ativas ────────────────────────────
  const { data: comandas = [], isLoading } = useQuery<Comanda[]>({
    queryKey: ['comandas', 'ativas', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comandas')
        .select(`
          *,
          itens: comanda_itens(id, status, quantidade, subtotal, produto_nome_snapshot),
          garcom: usuarios!aberta_por(nome)
        `)
        .eq('estabelecimento_id', estabelecimento!.id)
        .in('status', ['ATIVA', 'CONTA_PEDIDA'])
        .order('aberta_em', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as Comanda[]
    },
  })

  // ── Fetch mesas preset ───────────────────────────────
  const { data: mesas = [] } = useQuery<MesaPreset[]>({
    queryKey: ['mesas-preset', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mesas_preset')
        .select('*')
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('ativa', true)
        .order('ordem_exibicao')
      if (error) throw error
      return data ?? []
    },
  })

  // ── Criar comanda ────────────────────────────────────
  const criarComanda = useMutation({
    mutationFn: async (identificacao: string) => {
      if (!estabelecimento?.id || !user?.id) {
        throw new Error('Usuário ou estabelecimento não carregado. Aguarde e tente novamente.')
      }
      const { data, error } = await supabase
        .from('comandas')
        .insert({
          estabelecimento_id: estabelecimento.id,
          identificacao,
          aberta_por: user.id,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['comandas'] })
      router.push(`/comanda/${data.id}`)
    },
    onError: (err: Error) => {
      const msg = err.message.includes('uq_comanda_identificacao_ativa')
        ? 'Já existe uma comanda aberta com esse nome.'
        : 'Erro ao abrir comanda. Tente novamente.'
      toast.error(msg)
    },
  })

  const abrirMesaLivre = (nomeMesa: string) => {
    // Clicou em mesa livre: pré-seleciona o nome e abre drawer
    setMesaPreSelected(nomeMesa)
    setDrawerOpen(true)
  }

  const comandasOrdenadas = [...comandas].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  )

  const comandasAbertasNomes = comandas.map((c) => c.identificacao.toLowerCase())

  // Grid: todos os presets + suas comandas (se tiverem)
  const mesaItems = mesas.map((mesa) => ({
    mesa,
    comanda: comandas.find(
      (c) => c.identificacao.trim().toLowerCase() === mesa.nome.trim().toLowerCase()
    ),
  }))

  // Comandas que não correspondem a nenhum preset (abertas manualmente)
  const outrasComandas = comandas.filter(
    (c) => !mesas.some((m) => m.nome.trim().toLowerCase() === c.identificacao.trim().toLowerCase())
  )

  // Stats
  const qntAtivas     = comandas.filter((c) => c.status === 'ATIVA').length
  const qntContaPedida = comandas.filter((c) => c.status === 'CONTA_PEDIDA').length
  const totalHoje     = comandas.reduce((acc, c) => acc + (c.total_bruto ?? 0), 0)

  const primeiroNome = user?.nome?.split(' ')[0] ?? 'Garçom'

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-body)]">

      {/* ── Header escuro ──────────────────────────────── */}
      <header className="bg-[var(--s-black)] px-5 py-4 shrink-0 pt-safe">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <h1 className="text-lg font-black text-[var(--p-orange)] tracking-tight leading-none">
              Bota na Conta
            </h1>
          </div>
          <OfflineBadge />
        </div>
        <p className="text-xs text-white/50">
          {estabelecimento?.nome} · Olá, {primeiroNome} 👋
        </p>
      </header>

      {/* ── Conteúdo rolável ───────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { val: qntAtivas,      label: 'Mesas ativas',    color: 'var(--p-orange)' },
            { val: `R$${Math.round(totalHoje)}`, label: 'Total em aberto', color: 'var(--success)' },
            { val: qntContaPedida, label: 'Conta pedida',    color: 'var(--danger)' },
          ].map((s) => (
            <div key={s.label} className="card py-3 px-2 text-center">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-[var(--s-gray-400)] font-medium mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Grid de mesas */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-extrabold text-[var(--s-black)]">Mesas</h2>
            {/* Legenda */}
            <div className="flex items-center gap-3">
              {[
                { color: 'var(--s-gray-400)', label: 'Livre' },
                { color: 'var(--p-orange)',   label: 'Ocupada' },
                { color: 'var(--danger)',      label: 'Conta' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
                  <span className="text-[10px] text-[var(--s-gray-400)] font-medium">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="card h-24 animate-pulse bg-[var(--s-gray-100)]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {/* Mesas preset + suas comandas */}
              {mesaItems.map(({ mesa, comanda }) => (
                <MesaGridCard
                  key={mesa.id}
                  nome={mesa.nome}
                  comanda={comanda}
                  onClick={() =>
                    comanda
                      ? router.push(`/comanda/${comanda.id}`)
                      : abrirMesaLivre(mesa.nome)
                  }
                />
              ))}

              {/* Comandas sem preset (ex: "Balcão VIP") */}
              {outrasComandas.map((c) => (
                <MesaGridCard
                  key={c.id}
                  nome={c.identificacao}
                  comanda={c}
                  onClick={() => router.push(`/comanda/${c.id}`)}
                />
              ))}

              {/* Botão nova comanda */}
              <MesaGridNova onClick={() => setDrawerOpen(true)} />
            </div>
          )}
        </section>

        {/* Pedidos em aberto */}
        {comandasOrdenadas.length > 0 && (
          <section>
            <h2 className="text-sm font-extrabold text-[var(--s-black)] mb-2.5">
              Pedidos em aberto
            </h2>
            <div className="flex flex-col gap-2">
              {comandasOrdenadas.map((c) => (
                <AorderRow
                  key={c.id}
                  comanda={c}
                  onClick={() => router.push(`/comanda/${c.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && comandas.length === 0 && mesas.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-[var(--s-gray-400)]">
            <LogoMark size={56} className="opacity-40" />
            <p className="font-semibold text-sm">Nenhuma mesa cadastrada</p>
            <p className="text-xs text-center">Configure as mesas no painel admin.</p>
          </div>
        )}
      </main>

      {/* ── Bottom Nav ─────────────────────────────────── */}
      <BottomNav />

      {/* Drawer nova comanda */}
      <NovaComandaDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setMesaPreSelected('') }}
        onConfirm={async (id) => { await criarComanda.mutateAsync(id) }}
        mesas={mesas}
        comandasAbertasNomes={comandasAbertasNomes}
        initialValue={mesaPreSelected}
      />
    </div>
  )
}
