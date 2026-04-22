'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

const ROTAS_PUBLICAS = ['/setup', '/estabelecimento', '/convite']

/**
 * Popula o AuthStore com o perfil, estabelecimento e configurações
 * do usuário autenticado. Chame no layout protegido.
 *
 * B-USR-03: usa SELECT (array) em vez de .maybeSingle() para suportar
 * usuários com múltiplos estabelecimentos. Prefere o estabelecimento
 * já salvo no store; se não houver preferência e houver N > 1, redireciona
 * para o switcher em /estabelecimento.
 */
export function useAuthInit() {
  const { setUser, setEstabelecimento, setPerfil, setConfiguracoes, setLoading, estabelecimento } =
    useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  useEffect(() => {
    const supabase = createClient()

    const init = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: publicUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (publicUser) {
        setUser(publicUser)
      } else {
        setUser({
          id: user.id,
          nome: (user.user_metadata?.nome as string | undefined)
            ?? user.email?.split('@')[0]
            ?? 'Usuário',
          email: user.email ?? '',
          criado_em: user.created_at,
          atualizado_em: user.updated_at ?? user.created_at,
        })
      }

      // B-USR-03: busca todos os vínculos ativos (não usa .maybeSingle)
      const { data: vinculos } = await supabase
        .from('usuario_estabelecimento')
        .select('perfil, estabelecimento_id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (!vinculos?.length) {
        setLoading(false)
        const storeEstab = useAuthStore.getState().estabelecimento
        if (!storeEstab && !ROTAS_PUBLICAS.includes(pathnameRef.current)) {
          router.push('/setup')
        }
        return
      }

      // Prefere o estabelecimento já salvo no store (persistido pelo switcher ou setup anterior)
      const storedId = useAuthStore.getState().estabelecimento?.id
      const vinculo =
        vinculos.find((v) => v.estabelecimento_id === storedId) ?? vinculos[0]

      // Se há múltiplos e nenhum preferido foi encontrado, vai para o switcher
      if (vinculos.length > 1 && !storedId && !ROTAS_PUBLICAS.includes(pathnameRef.current)) {
        setLoading(false)
        router.push('/estabelecimento')
        return
      }

      setPerfil(vinculo.perfil as 'ADMIN' | 'GARCOM' | 'COZINHA')

      const { data: estab } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('id', vinculo.estabelecimento_id)
        .maybeSingle()

      if (estab) setEstabelecimento(estab)

      const { data: config } = await supabase
        .from('configuracoes_estabelecimento')
        .select('*')
        .eq('estabelecimento_id', vinculo.estabelecimento_id)
        .maybeSingle()

      if (config) setConfiguracoes(config)

      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        setEstabelecimento(null)
        setPerfil(null)
        setConfiguracoes(null)
      } else {
        init()
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser, setEstabelecimento, setPerfil, setConfiguracoes, setLoading, router])
}
