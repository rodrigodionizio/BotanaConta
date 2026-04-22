'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface ToggleItem {
  key: keyof ConfiguracoesToggle
  label: string
  sub: string
  icon: string
  adminOnly?: boolean
}

interface ConfiguracoesToggle {
  taxa_servico_ativa: boolean
  permite_garcom_fechar_conta: boolean
  permite_garcom_aplicar_desconto: boolean
  alerta_sonoro_cozinha: boolean
}

const TOGGLE_ITEMS: ToggleItem[] = [
  { key: 'taxa_servico_ativa',               label: 'Taxa de serviço',           sub: 'Cobrar taxa sobre subtotal',             icon: '💰', adminOnly: true },
  { key: 'permite_garcom_fechar_conta',      label: 'Garçom fecha conta',        sub: 'Garçom pode encerrar comandas',          icon: '🪙' },
  { key: 'permite_garcom_aplicar_desconto',  label: 'Garçom aplica desconto',    sub: 'Garçom pode conceder descontos',         icon: '🏷️' },
  { key: 'alerta_sonoro_cozinha',            label: 'Alerta sonoro na cozinha',  sub: 'Som ao receber novo ticket',             icon: '🔔' },
]

export default function SistemaPage() {
  const router = useRouter()
  const { estabelecimento, perfil, configuracoes } = useAuthStore()
  const supabase    = createClient()
  const queryClient = useQueryClient()
  const isAdmin = perfil === 'ADMIN'

  const { data: config } = useQuery({
    queryKey: ['config-sistema', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_estabelecimento')
        .select('taxa_servico_ativa, permite_garcom_fechar_conta, permite_garcom_aplicar_desconto, alerta_sonoro_cozinha')
        .eq('estabelecimento_id', estabelecimento!.id)
        .maybeSingle()
      if (error) throw error
      return data as ConfiguracoesToggle | null
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: keyof ConfiguracoesToggle; value: boolean }) => {
      if (!estabelecimento?.id) throw new Error('Setup inválido')
      const { error } = await supabase
        .from('configuracoes_estabelecimento')
        .update({ [key]: value } as unknown as { taxa_servico_ativa?: boolean; permite_garcom_fechar_conta?: boolean; permite_garcom_aplicar_desconto?: boolean; alerta_sonoro_cozinha?: boolean })
        .eq('estabelecimento_id', estabelecimento.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-sistema', estabelecimento?.id] })
    },
  })

  const visibleItems = isAdmin ? TOGGLE_ITEMS : TOGGLE_ITEMS.filter((i) => !i.adminOnly)

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
        <h1 className="text-xl font-black text-[var(--p-orange)]">🔔 Sistema</h1>
        <p className="text-xs text-white/50 mt-1">Comportamento do aplicativo</p>
      </header>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

        <div className="card overflow-hidden">
          {visibleItems.map((item, i) => {
            const checked = config?.[item.key] ?? false
            return (
              <div
                key={item.key}
                className={`flex items-center gap-3 px-4 py-4 ${
                  i < visibleItems.length - 1 ? 'border-b border-[var(--s-gray-200)]' : ''
                }`}
              >
                <span className="text-2xl w-8 text-center">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--s-black)]">{item.label}</p>
                  <p className="text-[10px] text-[var(--s-gray-400)] mt-0.5">{item.sub}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={checked}
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate({ key: item.key, value: !checked })}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    checked ? 'bg-[var(--p-orange)]' : 'bg-[var(--s-gray-200)]'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>

        {/* Links para outras seções de sistema */}
        {isAdmin && (
          <section>
            <h2 className="text-xs font-extrabold text-[var(--s-gray-400)] uppercase tracking-wide mb-2.5">
              Gerenciamento
            </h2>
            <div className="card overflow-hidden">
              {[
                { href: '/admin/usuarios',  icon: '👤', label: 'Usuários',   sub: 'Equipe do estabelecimento' },
                { href: '/admin/relatorios',icon: '📊', label: 'Relatórios', sub: 'Exportar por período' },
              ].map((link, i, arr) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--bg-body)] transition-colors ${
                    i < arr.length - 1 ? 'border-b border-[var(--s-gray-200)]' : ''
                  }`}
                >
                  <span className="text-2xl w-8 text-center">{link.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--s-black)]">{link.label}</p>
                    <p className="text-[10px] text-[var(--s-gray-400)] mt-0.5">{link.sub}</p>
                  </div>
                  <span className="text-[var(--s-gray-400)] text-sm">›</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
