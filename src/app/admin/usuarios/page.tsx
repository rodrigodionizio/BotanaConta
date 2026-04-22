'use client'

import { useState, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Dialog'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ShieldCheck, UtensilsCrossed, ChefHat,
  ToggleLeft, ToggleRight, UserPlus, Clock, X,
} from 'lucide-react'
import { PerfilUsuario } from '@/types'
import { criarConvite, cancelarConvite } from '@/app/actions/usuarios'

interface MembroEquipe {
  id: string
  perfil: PerfilUsuario
  ativo: boolean
  usuario: {
    id: string
    nome: string
    email: string
  } | null
}

interface Convite {
  id: string
  email: string
  perfil: PerfilUsuario
  enviado_em: string
  expira_em: string
  status: string
}

const PERFIS: { value: PerfilUsuario; label: string; icon: React.ReactNode; cor: string }[] = [
  { value: 'ADMIN',   label: 'Administrador', icon: <ShieldCheck size={14} />,     cor: 'var(--p-orange)' },
  { value: 'GARCOM',  label: 'Garçom',        icon: <UtensilsCrossed size={14} />, cor: 'var(--info)' },
  { value: 'COZINHA', label: 'Cozinha',        icon: <ChefHat size={14} />,         cor: '#8B5CF6' },
]

function BadgePerfil({ perfil }: { perfil: PerfilUsuario }) {
  const p = PERFIS.find(x => x.value === perfil)
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${p?.cor}22`, color: p?.cor }}
    >
      {p?.icon}
      {p?.label}
    </span>
  )
}

function Iniciais({ nome }: { nome: string }) {
  const partes = nome.trim().split(' ')
  const ini = partes.length >= 2
    ? partes[0][0] + partes[partes.length - 1][0]
    : partes[0].slice(0, 2)
  return <>{ini.toUpperCase()}</>
}

function tempoRelativo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const dias = Math.floor(diff / 86_400_000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
}

export default function AdminUsuariosPage() {
  const router = useRouter()
  const { estabelecimento, perfil: perfilAtual, isLoading: authLoading, user } = useAuthStore()
  const supabase = createClient()
  const qc = useQueryClient()

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novoPerfil, setNovoPerfil] = useState<PerfilUsuario>('GARCOM')
  const [modalConviteOpen, setModalConviteOpen] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [perfilConvite, setPerfilConvite] = useState<PerfilUsuario>('GARCOM')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!authLoading && perfilAtual !== null && perfilAtual !== 'ADMIN') {
      router.replace(perfilAtual === 'COZINHA' ? '/cozinha' : '/mesas')
    }
  }, [authLoading, perfilAtual, router])

  const { data: equipe = [], isLoading } = useQuery<MembroEquipe[]>({
    queryKey: ['admin-usuarios', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuario_estabelecimento')
        .select('id, perfil, ativo, usuarios!usuario_id(id, nome, email)')
        .eq('estabelecimento_id', estabelecimento!.id)
        .order('perfil')
      if (error) throw error
      return (data ?? []) as unknown as MembroEquipe[]
    },
  })

  const { data: convitesPendentes = [] } = useQuery<Convite[]>({
    queryKey: ['admin-convites', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convites')
        .select('id, email, perfil, enviado_em, expira_em, status')
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('status', 'PENDENTE')
        .order('enviado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as Convite[]
    },
  })

  const alterarPerfil = useMutation({
    mutationFn: async ({ id, perfil }: { id: string; perfil: PerfilUsuario }) => {
      const { error } = await supabase
        .from('usuario_estabelecimento')
        .update({ perfil })
        .eq('id', id)
      if (error) {
        // B-USR-04: trigger enforce_last_admin
        if (error.message.includes('BNC_LAST_ADMIN')) {
          throw new Error('Você é o último administrador ativo e não pode ser rebaixado.')
        }
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      setEditandoId(null)
      toast.success('Perfil atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('usuario_estabelecimento')
        .update({ ativo: !ativo })
        .eq('id', id)
      if (error) {
        // B-USR-05: trigger enforce_last_admin
        if (error.message.includes('BNC_LAST_ADMIN')) {
          throw new Error('Você é o último administrador ativo e não pode ser desativado.')
        }
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      toast.success('Status atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const cancelar = useMutation({
    mutationFn: (conviteId: string) => cancelarConvite(conviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-convites'] })
      toast.success('Convite cancelado.')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const membroCount = equipe.filter(m => m.ativo).length
  const totalCount = membroCount + convitesPendentes.length

  return (
    <div className="min-h-dvh bg-[var(--bg-body)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-3 border-b border-[var(--s-gray-200)] sticky top-0 z-30 pt-safe">
        <button className="btn-ghost p-2" onClick={() => router.push('/admin')} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-extrabold text-lg leading-tight">Equipe</h1>
          <p className="text-xs text-[var(--s-gray-400)]">{totalCount} membros</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => { setEmailConvite(''); setPerfilConvite('GARCOM'); setModalConviteOpen(true) }}
        >
          <UserPlus size={16} /> Convidar
        </Button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">

        {/* Seção: Convites Pendentes */}
        {convitesPendentes.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="text-xs font-bold text-[var(--s-gray-500)] uppercase tracking-wide px-1">
              Aguardando aceite ({convitesPendentes.length})
            </p>
            {convitesPendentes.map((c) => {
              const p = PERFIS.find(x => x.value === c.perfil)
              return (
                <div key={c.id} className="card p-4 flex items-center gap-3 border-dashed">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${p?.cor}22` }}
                  >
                    <Clock size={18} style={{ color: p?.cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <BadgePerfil perfil={c.perfil} />
                      <span className="text-xs text-[var(--s-gray-400)]">
                        enviado {tempoRelativo(c.enviado_em)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-ghost p-1.5 text-[var(--s-gray-400)]"
                    onClick={() => cancelar.mutate(c.id)}
                    aria-label="Cancelar convite"
                    title="Cancelar convite"
                    disabled={cancelar.isPending}
                  >
                    <X size={18} />
                  </button>
                </div>
              )
            })}
          </section>
        )}

        {/* Seção: Membros Ativos */}
        <section className="flex flex-col gap-2">
          {convitesPendentes.length > 0 && (
            <p className="text-xs font-bold text-[var(--s-gray-500)] uppercase tracking-wide px-1">
              Membros ativos ({membroCount})
            </p>
          )}
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-20 animate-pulse bg-[var(--s-gray-100)]" />
            ))
          ) : equipe.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-2 text-[var(--s-gray-400)]">
              <p className="font-semibold text-sm">Nenhum membro cadastrado</p>
              <p className="text-xs text-center">
                Convide o primeiro membro da sua equipe clicando em <strong>Convidar</strong>.
              </p>
            </div>
          ) : (
            equipe.map((membro) => {
              const ehEuMesmo = membro.usuario?.id === user?.id
              const isEditando = editandoId === membro.id
              return (
                <div key={membro.id} className={`card p-4 flex flex-col gap-3 ${!membro.ativo ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                      style={{ background: PERFIS.find(p => p.value === membro.perfil)?.cor ?? 'var(--s-gray-400)' }}
                    >
                      {membro.usuario ? <Iniciais nome={membro.usuario.nome} /> : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">
                        {membro.usuario?.nome ?? 'Usuário desconhecido'}
                        {ehEuMesmo && (
                          <span className="ml-1.5 text-xs font-normal text-[var(--s-gray-400)]">(você)</span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--s-gray-400)] truncate">{membro.usuario?.email}</p>
                    </div>
                    {!ehEuMesmo && (
                      <button
                        className="btn-ghost p-1.5"
                        onClick={() => toggleAtivo.mutate({ id: membro.id, ativo: membro.ativo })}
                        aria-label={membro.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                        title={membro.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {membro.ativo
                          ? <ToggleRight size={22} className="text-[var(--success)]" />
                          : <ToggleLeft size={22} className="text-[var(--s-gray-400)]" />
                        }
                      </button>
                    )}
                  </div>

                  {!isEditando ? (
                    <div className="flex items-center justify-between">
                      <BadgePerfil perfil={membro.perfil} />
                      {!ehEuMesmo && (
                        <button
                          className="text-xs text-[var(--info)] font-semibold"
                          onClick={() => { setEditandoId(membro.id); setNovoPerfil(membro.perfil) }}
                        >
                          Alterar perfil
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-[var(--s-gray-600)]">Selecionar perfil:</p>
                      <div className="flex gap-2 flex-wrap">
                        {PERFIS.map((p) => (
                          <button
                            key={p.value}
                            onClick={() => setNovoPerfil(p.value)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors"
                            style={{
                              borderColor: novoPerfil === p.value ? p.cor : 'var(--s-gray-200)',
                              color: novoPerfil === p.value ? p.cor : 'var(--s-gray-400)',
                              background: novoPerfil === p.value ? `${p.cor}11` : 'transparent',
                            }}
                          >
                            {p.icon}
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="primary" size="sm" fullWidth
                          loading={alterarPerfil.isPending}
                          onClick={() => alterarPerfil.mutate({ id: membro.id, perfil: novoPerfil })}
                        >
                          Salvar
                        </Button>
                        <Button variant="secondary" size="sm" fullWidth onClick={() => setEditandoId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </section>

        <div className="card p-4 bg-[var(--s-gray-50)]">
          <p className="text-xs text-[var(--s-gray-400)] leading-relaxed">
            <strong>Convite por e-mail:</strong> O convidado receberá um link para criar sua senha e acessar o sistema. O vínculo é criado automaticamente com o perfil selecionado.
          </p>
        </div>
      </main>

      {/* Modal de convite */}
      <Modal
        open={modalConviteOpen}
        onClose={() => setModalConviteOpen(false)}
        title="Convidar membro"
      >
        <form
          className="p-5 flex flex-col gap-5 pb-safe"
          onSubmit={(e) => {
            e.preventDefault()
            if (!estabelecimento?.id) return
            startTransition(async () => {
              try {
                const result = await criarConvite(
                  estabelecimento.id,
                  emailConvite.trim().toLowerCase(),
                  perfilConvite,
                )
                if (!result.ok && result.erro === 'JA_MEMBRO') {
                  toast.error('Este e-mail já é membro ativo do estabelecimento.')
                  return
                }
                toast.success('Convite enviado! O convidado receberá um e-mail.')
                qc.invalidateQueries({ queryKey: ['admin-convites'] })
                setModalConviteOpen(false)
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Erro ao enviar convite')
              }
            })
          }}
        >
          <Input
            label="E-mail do convidado *"
            type="email"
            placeholder="garcom@email.com"
            value={emailConvite}
            onChange={(e) => setEmailConvite(e.target.value)}
            required
          />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Perfil</p>
            <div className="flex gap-2 flex-wrap">
              {PERFIS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPerfilConvite(p.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors"
                  style={{
                    borderColor: perfilConvite === p.value ? p.cor : 'var(--s-gray-200)',
                    color: perfilConvite === p.value ? p.cor : 'var(--s-gray-400)',
                    background: perfilConvite === p.value ? `${p.cor}11` : 'transparent',
                  }}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isPending}
            disabled={!emailConvite}
          >
            Enviar convite
          </Button>
        </form>
      </Modal>
    </div>
  )
}
