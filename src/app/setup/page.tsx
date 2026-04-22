'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth'
import { Estabelecimento } from '@/types'
import { LogoFull } from '@/components/ui/Logo'
import toast from 'react-hot-toast'

export default function SetupPage() {
  const [nomeEstab, setNomeEstab] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setEstabelecimento, setPerfil } = useAuthStore()
  const supabase = createClient()

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeEstab.trim()) return

    setLoading(true)
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Não autenticado. Faça login novamente.')

      // Chama a Database Function que cria tudo atomicamente
      // (contorna restrições RLS no onboarding)
      const { data: estabJson, error: rpcErr } = await supabase
        .rpc('setup_estabelecimento', { nome_estab: nomeEstab.trim() })

      // B-SETUP-03: usuário já tem estabelecimento (duplo clique ou reload)
      if (rpcErr?.message?.includes('BNC_VINCULO_EXISTE')) {
        const { data: vinculos } = await supabase
          .from('usuario_estabelecimento')
          .select('estabelecimento_id, perfil, estabelecimentos(id, nome, ativo, criado_em, atualizado_em)')
          .eq('usuario_id', user.id)
          .eq('ativo', true)
          .limit(1)

        if (vinculos?.length) {
          const v = vinculos[0] as { perfil: string; estabelecimentos: Estabelecimento | null }
          if (v.estabelecimentos) setEstabelecimento(v.estabelecimentos)
          setPerfil((v.perfil as 'ADMIN' | 'GARCOM' | 'COZINHA') ?? 'ADMIN')
          toast('Você já possui um estabelecimento.', { icon: 'ℹ️' })
          router.push('/admin')
          return
        }
      }

      if (rpcErr) throw rpcErr

      // RPC retorna JSON — converte para o tipo correto
      const estab = estabJson as unknown as Estabelecimento

      // Atualiza store
      setEstabelecimento(estab)
      setPerfil('ADMIN')

      toast.success(`${estab.nome} criado com sucesso!`)
      router.push('/admin')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao configurar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 bg-(--bg-body)">
      <div className="flex flex-col items-center mb-10">
        <LogoFull size={180} priority className="mb-1" />
        <p className="text-(--s-gray-400) text-sm">Primeiro acesso</p>
      </div>

      <div className="card w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">Seja bem-vindo!</h2>
        <p className="text-sm text-(--s-gray-400) mb-6">
          Vamos criar seu estabelecimento em 30 segundos.
        </p>

        <form onSubmit={handleSetup} className="flex flex-col gap-4">
          <Input
            label="Nome do estabelecimento"
            type="text"
            placeholder="Ex: Bar do João, Restaurante Bom Sabor…"
            value={nomeEstab}
            onChange={(e) => setNomeEstab(e.target.value)}
            autoFocus
            required
          />
          <Button type="submit" disabled={loading || !nomeEstab.trim()}>
            {loading ? 'Criando…' : 'Criar e entrar'}
          </Button>
        </form>
      </div>

      <button
        className="mt-6 text-xs text-(--s-gray-400) underline underline-offset-2"
        onClick={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
      >
        Usar outra conta
      </button>
    </div>
  )
}
