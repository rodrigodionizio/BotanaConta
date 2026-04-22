import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const conviteToken = searchParams.get('convite_token')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const supabase = await createClient()
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeErr) {
    console.error('[auth/callback] exchangeCodeForSession:', exchangeErr.message)
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  // B-USR-02: processa token de convite quando presente
  if (conviteToken) {
    const { data, error: conviteErr } = await supabase.rpc('aceitar_convite', {
      p_token: conviteToken,
    })

    if (conviteErr) {
      console.error('[auth/callback] aceitar_convite:', conviteErr.message)
      // Token inválido ou email errado — redireciona para página de convite com erro
      return NextResponse.redirect(
        `${origin}/convite?token=${encodeURIComponent(conviteToken)}&erro=${encodeURIComponent(conviteErr.message)}`
      )
    }

    const perfil = (data as { perfil?: string } | null)?.perfil
    const destino = perfil === 'ADMIN' ? '/admin' : perfil === 'COZINHA' ? '/cozinha' : '/mesas'
    return NextResponse.redirect(`${origin}${destino}`)
  }

  // B-USR-03: verifica quantos vínculos o usuário tem
  const { data: vinculos } = await supabase
    .from('usuario_estabelecimento')
    .select('estabelecimento_id, perfil')
    .eq('ativo', true)

  if (!vinculos?.length) {
    return NextResponse.redirect(`${origin}/setup`)
  }

  if (vinculos.length === 1) {
    const perfil = vinculos[0].perfil
    const destino = next ?? (perfil === 'ADMIN' ? '/admin' : perfil === 'COZINHA' ? '/cozinha' : '/mesas')
    return NextResponse.redirect(`${origin}${destino}`)
  }

  // Múltiplos estabelecimentos — deixa o switcher decidir
  return NextResponse.redirect(`${origin}/estabelecimento`)
}
