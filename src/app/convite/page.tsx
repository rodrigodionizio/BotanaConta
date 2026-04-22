'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { LogoFull } from '@/components/ui/Logo'
import toast from 'react-hot-toast'
import { ShieldCheck, UtensilsCrossed, ChefHat, Building2, XCircle } from 'lucide-react'

interface InviteInfo {
  valido: boolean
  estabelecimento_nome?: string
  perfil?: string
  email?: string
  motivo?: string
}

const PERFIL_LABEL: Record<string, { label: string; icon: React.ReactNode; cor: string }> = {
  ADMIN:   { label: 'Administrador', icon: <ShieldCheck size={16} />,     cor: 'var(--p-orange)' },
  GARCOM:  { label: 'Garçom',        icon: <UtensilsCrossed size={16} />, cor: 'var(--info)' },
  COZINHA: { label: 'Cozinheiro',    icon: <ChefHat size={16} />,         cor: '#8B5CF6' },
}

const MOTIVO_MSG: Record<string, string> = {
  token_invalido: 'Este link de convite não é válido.',
  aceito:         'Este convite já foi aceito.',
  cancelado:      'Este convite foi cancelado.',
  expirado:       'Este convite expirou. Peça ao administrador que envie um novo.',
}

export default function ConvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const erroParam = searchParams.get('erro')

  const supabase = createClient()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [autenticado, setAutenticado] = useState(false)
  const [aceitando, setAceitando] = useState(false)

  useEffect(() => {
    if (!token) {
      setInfo({ valido: false, motivo: 'token_invalido' })
      return
    }

    async function verificar() {
      const { data: { user } } = await supabase.auth.getUser()
      setAutenticado(!!user)

      const { data, error } = await supabase.rpc('validar_convite', { p_token: token })
      if (error) {
        setInfo({ valido: false, motivo: 'token_invalido' })
      } else {
        setInfo(data as InviteInfo)
      }
    }

    verificar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function aceitar() {
    setAceitando(true)
    const { data, error } = await supabase.rpc('aceitar_convite', { p_token: token })

    if (error) {
      toast.error(error.message.includes('BNC_EMAIL_MISMATCH')
        ? 'Este convite foi enviado para outro e-mail.'
        : error.message.includes('BNC_TOKEN_EXPIRADO')
        ? 'Este convite expirou.'
        : 'Erro ao aceitar convite. Tente novamente.')
      setAceitando(false)
      return
    }

    const perfil = (data as { perfil?: string } | null)?.perfil
    toast.success('Convite aceito! Bem-vindo à equipe.')
    const destino = perfil === 'ADMIN' ? '/admin' : perfil === 'COZINHA' ? '/cozinha' : '/mesas'
    router.push(destino)
  }

  if (!info) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--bg-body)">
        <div className="w-8 h-8 border-4 border-(--p-orange) border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!info.valido) {
    const msg = erroParam
      ? decodeURIComponent(erroParam)
      : MOTIVO_MSG[info.motivo ?? ''] ?? 'Link inválido ou expirado.'

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-5 bg-(--bg-body)">
        <LogoFull size={140} priority className="mb-8" />
        <div className="card w-full max-w-sm p-6 flex flex-col items-center gap-4 text-center">
          <XCircle size={40} className="text-(--error)" />
          <h2 className="font-bold text-lg">Convite inválido</h2>
          <p className="text-sm text-(--s-gray-400)">{msg}</p>
          <Button variant="secondary" fullWidth onClick={() => router.push('/login')}>
            Ir para o login
          </Button>
        </div>
      </div>
    )
  }

  const perfilCfg = PERFIL_LABEL[info.perfil ?? '']

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 bg-(--bg-body)">
      <LogoFull size={140} priority className="mb-8" />

      <div className="card w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-(--s-gray-100) flex items-center justify-center">
            <Building2 size={28} className="text-(--s-gray-400)" />
          </div>
          <div>
            <p className="text-xs text-(--s-gray-400) mb-0.5">Você foi convidado para</p>
            <h2 className="font-extrabold text-lg">{info.estabelecimento_nome}</h2>
          </div>
          {perfilCfg && (
            <span
              className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: `${perfilCfg.cor}22`, color: perfilCfg.cor }}
            >
              {perfilCfg.icon}
              {perfilCfg.label}
            </span>
          )}
        </div>

        {autenticado ? (
          <Button variant="primary" fullWidth loading={aceitando} onClick={aceitar}>
            Aceitar convite
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-(--s-gray-400) text-center">
              Faça login com o e-mail <strong>{info.email}</strong> para aceitar o convite.
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/convite?token=${token}`)}`)}
            >
              Fazer login
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
