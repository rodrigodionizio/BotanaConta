'use client'

import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/ui/BottomNav'
import { useAuthStore } from '@/store/auth'
import { createClient } from '@/lib/supabase/client'

interface ConfigItem {
  icon: string
  label: string
  sub: string
  href: string
  adminOnly?: boolean
}

const ESTABELECIMENTO_ITEMS: ConfigItem[] = [
  { icon: '🍢', label: 'Cardápio e Preços',  sub: 'Gerenciar produtos, categorias e valores', href: '/config/cardapio', adminOnly: true },
  { icon: '🪑', label: 'Mesas',              sub: 'Configurar quantidade e layout',           href: '/config/mesas',   adminOnly: true },
  { icon: '🖨️', label: 'Impressora',         sub: 'Bluetooth · Térmica ESC/POS',             href: '/config/impressoras' },
]

const SISTEMA_ITEMS: ConfigItem[] = [
  { icon: '👤', label: 'Garçons / Usuários', sub: 'Equipe do estabelecimento',                 href: '/admin/usuarios',  adminOnly: true },
  { icon: '📊', label: 'Relatórios',         sub: 'Exportar por dia, semana ou mês',           href: '/admin/relatorios', adminOnly: true },
  { icon: '🔔', label: 'Notificações',       sub: 'Alertas de pedido e conta',                 href: '/config/sistema',  adminOnly: true },
  { icon: '🍳', label: 'Cozinha',            sub: 'Gerenciar tickets por garçom',              href: '/config/cozinha',  adminOnly: true },
]

export default function ConfigPage() {
  const router = useRouter()
  const { perfil, estabelecimento } = useAuthStore()
  const supabase = createClient()
  const isAdmin = perfil === 'ADMIN'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filterItems = (items: ConfigItem[]) =>
    isAdmin ? items : items.filter((i) => !i.adminOnly)

  const estItems = filterItems(ESTABELECIMENTO_ITEMS)
  const sysItems = filterItems(SISTEMA_ITEMS)

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-body)]">

      {/* ── Header ───────────────────────────────────── */}
      <header className="bg-[var(--s-black)] px-5 py-4 shrink-0 pt-safe">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[var(--p-orange)]">⚙️ Config</h1>
            <p className="text-xs text-white/50 mt-1 truncate max-w-[220px]">
              {estabelecimento?.nome ?? 'Configurações do app'}
            </p>
          </div>
          {isAdmin && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[rgba(255,91,34,0.15)] text-[var(--p-orange)] uppercase">
              Admin
            </span>
          )}
        </div>
      </header>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

        {/* Estabelecimento */}
        {estItems.length > 0 && (
          <section>
            <h2 className="text-xs font-extrabold text-[var(--s-gray-400)] uppercase tracking-wide mb-2.5">
              Estabelecimento
            </h2>
            <div className="card overflow-hidden">
              {estItems.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--bg-body)] transition-colors ${
                    i < estItems.length - 1 ? 'border-b border-[var(--s-gray-200)]' : ''
                  }`}
                >
                  <span className="text-2xl w-8 text-center">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--s-black)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--s-gray-400)] mt-0.5">{item.sub}</p>
                  </div>
                  <span className="text-[var(--s-gray-400)] text-sm">›</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Sistema */}
        {sysItems.length > 0 && (
          <section>
            <h2 className="text-xs font-extrabold text-[var(--s-gray-400)] uppercase tracking-wide mb-2.5">
              Sistema
            </h2>
            <div className="card overflow-hidden">
              {sysItems.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--bg-body)] transition-colors ${
                    i < sysItems.length - 1 ? 'border-b border-[var(--s-gray-200)]' : ''
                  }`}
                >
                  <span className="text-2xl w-8 text-center">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--s-black)]">{item.label}</p>
                    <p className="text-[10px] text-[var(--s-gray-400)] mt-0.5">{item.sub}</p>
                  </div>
                  <span className="text-[var(--s-gray-400)] text-sm">›</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Sair */}
        <section>
          <div className="card overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--bg-body)] transition-colors"
            >
              <span className="text-2xl w-8 text-center">🚪</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--danger)]">Sair</p>
                <p className="text-[10px] text-[var(--s-gray-400)] mt-0.5">Encerrar sessão</p>
              </div>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
