'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { LogoFull } from '@/components/ui/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // B-USR-03: busca todos os vínculos (suporta multi-estabelecimento)
      const { data: vinculos } = await supabase
        .from('usuario_estabelecimento')
        .select('perfil, estabelecimento_id')
        .eq('usuario_id', data.user.id)
        .eq('ativo', true)

      let destino: string
      if (!vinculos?.length) {
        destino = '/setup'
      } else if (vinculos.length === 1) {
        destino = vinculos[0].perfil === 'ADMIN' ? '/admin'
          : vinculos[0].perfil === 'COZINHA' ? '/cozinha'
          : '/mesas'
      } else {
        destino = '/estabelecimento'
      }

      router.push(destino)
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login'
      toast.error(msg === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 bg-[var(--bg-body)]">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <LogoFull size={210} priority className="mb-1" />
        <p className="text-[var(--s-gray-400)] text-sm">
          Sistema de comanda digital
        </p>
      </div>

      {/* Form */}
      <div className="card w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-5">Entrar</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            type="submit"
            size="lg"
            className="mt-2"
          >
            Entrar
          </Button>
        </form>
      </div>

      <p className="text-xs text-[var(--s-gray-400)] mt-6 text-center">
        Em caso de dúvidas, fale com o administrador do estabelecimento.
      </p>
    </div>
  )
}
