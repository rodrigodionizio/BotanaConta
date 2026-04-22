'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { LogoFull } from '@/components/ui/Logo'
import toast from 'react-hot-toast'
import { ShieldCheck, UtensilsCrossed, ChefHat, Building2 } from 'lucide-react'

interface OpcaoEstabelecimento {
  estabelecimento_id: string
  perfil: string
  estabelecimentos: {
    id: string
    nome: string
    ativo: boolean
    criado_em: string
    atualizado_em: string
  } | null
}

const PERFIL_CONFIG: Record<string, { label: string; icon: React.ReactNode; cor: string }> = {
  ADMIN:   { label: 'Administrador', icon: <ShieldCheck size={14} />,     cor: 'var(--p-orange)' },
  GARCOM:  { label: 'Garçom',        icon: <UtensilsCrossed size={14} />, cor: 'var(--info)' },
  COZINHA: { label: 'Cozinha',        icon: <ChefHat size={14} />,         cor: '#8B5CF6' },
}

export default function EstabelecimentoPage() {
  const router = useRouter()
  const { setEstabelecimento, setPerfil, setLoading } = useAuthStore()
  const supabase = createClient()

  const [opcoes, setOpcoes] = useState<OpcaoEstabelecimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [selecionando, setSelecionando] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('usuario_estabelecimento')
        .select('estabelecimento_id, perfil, estabelecimentos(id, nome, ativo, criado_em, atualizado_em)')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (error) {
        toast.error('Erro ao carregar estabelecimentos')
        setCarregando(false)
        return
      }

      if (!data?.length) {
        router.push('/setup')
        return
      }

      if (data.length === 1) {
        // Só um vínculo — seleciona automaticamente
        await selecionar(data[0] as OpcaoEstabelecimento)
        return
      }

      setOpcoes(data as OpcaoEstabelecimento[])
      setCarregando(false)
    }

    carregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function selecionar(opcao: OpcaoEstabelecimento) {
    if (!opcao.estabelecimentos) return
    setSelecionando(opcao.estabelecimento_id)
    setLoading(true)

    setEstabelecimento(opcao.estabelecimentos)
    setPerfil(opcao.perfil as 'ADMIN' | 'GARCOM' | 'COZINHA')

    const { data: config } = await supabase
      .from('configuracoes_estabelecimento')
      .select('*')
      .eq('estabelecimento_id', opcao.estabelecimento_id)
      .maybeSingle()

    const { setConfiguracoes } = useAuthStore.getState()
    if (config) setConfiguracoes(config)

    setLoading(false)

    const destino =
      opcao.perfil === 'ADMIN' ? '/admin'
      : opcao.perfil === 'COZINHA' ? '/cozinha'
      : '/mesas'

    router.push(destino)
  }

  if (carregando) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--bg-body)">
        <div className="w-8 h-8 border-4 border-(--p-orange) border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 bg-(--bg-body)">
      <div className="flex flex-col items-center mb-8">
        <LogoFull size={140} priority className="mb-1" />
        <p className="text-(--s-gray-400) text-sm">Selecione o estabelecimento</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {opcoes.map((opcao) => {
          const cfg = PERFIL_CONFIG[opcao.perfil]
          const isSelecionando = selecionando === opcao.estabelecimento_id
          return (
            <button
              key={opcao.estabelecimento_id}
              className="card p-4 flex items-center gap-4 text-left hover:border-(--p-orange) transition-colors disabled:opacity-60"
              disabled={!!selecionando}
              onClick={() => selecionar(opcao)}
            >
              <div className="w-11 h-11 rounded-xl bg-(--s-gray-100) flex items-center justify-center shrink-0">
                <Building2 size={22} className="text-(--s-gray-400)" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {opcao.estabelecimentos?.nome ?? 'Estabelecimento'}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-0.5"
                  style={{ color: cfg?.cor }}
                >
                  {cfg?.icon}
                  {cfg?.label}
                </span>
              </div>
              {isSelecionando && (
                <div className="w-4 h-4 border-2 border-(--p-orange) border-t-transparent rounded-full animate-spin shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
