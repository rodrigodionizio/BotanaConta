'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { PerfilUsuario } from '@/types'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Variáveis de ambiente SUPABASE não configuradas no servidor')
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function createSessionClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only neste contexto */ },
      },
    }
  )
}

async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export interface CriarConviteResult {
  ok: boolean
  conviteId?: string
  erro?: 'JA_MEMBRO' | 'CONVITE_JA_PENDENTE' | string
}

/**
 * Cria um convite para um membro da equipe.
 * O token é armazenado em public.convites e o link é enviado via Supabase Auth.
 * Não depende do retorno de data.user para criar vínculos — o aceite é feito
 * pelo convidado na rota /auth/callback?convite_token=TOKEN.
 */
export async function criarConvite(
  estabelecimentoId: string,
  email: string,
  perfil: PerfilUsuario,
): Promise<CriarConviteResult> {
  const supabase = await createSessionClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('Usuário não autenticado')

  // Valida que o chamador é ADMIN ativo deste estabelecimento
  const { data: vinculo, error: vinculoErr } = await supabase
    .from('usuario_estabelecimento')
    .select('perfil')
    .eq('usuario_id', user.id)
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('ativo', true)
    .single()

  if (vinculoErr || !vinculo) throw new Error('Sem vínculo ativo com este estabelecimento')
  if (vinculo.perfil !== 'ADMIN') throw new Error('Apenas administradores podem convidar membros')

  const emailNorm = email.trim().toLowerCase()

  // Verifica se já é membro ativo
  const adminClient = createAdminClient()
  const { data: membroExistente } = await adminClient
    .from('usuario_estabelecimento')
    .select('id, usuarios!usuario_id(email)')
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('ativo', true)

  const jaEMembro = membroExistente?.some(
    (m) => (m.usuarios as { email: string } | null)?.email?.toLowerCase() === emailNorm
  )
  if (jaEMembro) return { ok: false, erro: 'JA_MEMBRO' }

  // Cancela convite PENDENTE existente para este par (estabelecimento, email)
  await adminClient
    .from('convites')
    .update({ status: 'CANCELADO' })
    .eq('estabelecimento_id', estabelecimentoId)
    .eq('email', emailNorm)
    .eq('status', 'PENDENTE')

  // Gera token único
  const token = crypto.randomUUID() + '-' + crypto.randomUUID()

  // Insere convite
  const { data: convite, error: conviteErr } = await adminClient
    .from('convites')
    .insert({
      estabelecimento_id: estabelecimentoId,
      email: emailNorm,
      perfil,
      token,
      convidado_por: user.id,
    })
    .select('id')
    .single()

  if (conviteErr) throw new Error(conviteErr.message)

  // Envia e-mail via Supabase Auth — redirectTo embute o token para o callback processar
  const appUrl = await getAppUrl()
  const redirectTo = `${appUrl}/auth/callback?convite_token=${encodeURIComponent(token)}`

  const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(emailNorm, {
    redirectTo,
  })

  // Falha no envio do e-mail não reverte o convite — o ADMIN pode reenviar depois
  if (inviteErr) {
    console.error('[criarConvite] Erro ao enviar e-mail de convite:', inviteErr.message)
  }

  return { ok: true, conviteId: convite.id }
}

export interface CancelarConviteResult {
  ok: boolean
}

export async function cancelarConvite(conviteId: string): Promise<CancelarConviteResult> {
  const supabase = await createSessionClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('Usuário não autenticado')

  // A RLS garante que só ADMIN do estabelecimento pode atualizar convites
  const { error } = await supabase
    .from('convites')
    .update({ status: 'CANCELADO' })
    .eq('id', conviteId)
    .eq('status', 'PENDENTE')

  if (error) throw new Error(error.message)
  return { ok: true }
}
