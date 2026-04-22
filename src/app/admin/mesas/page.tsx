'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Pencil, Eye, EyeOff, Trash2, GripVertical } from 'lucide-react'
import { MesaPreset } from '@/types'

export default function AdminMesasPage() {
  const router = useRouter()
  const { estabelecimento, perfil, isLoading: authLoading } = useAuthStore()
  const supabase = createClient()
  const qc = useQueryClient()

  const [nomeMesa, setNomeMesa] = useState('')
  const [editando, setEditando] = useState<MesaPreset | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Guarda de perfil — só ADMIN acessa
  useEffect(() => {
    if (!authLoading && perfil !== null && perfil !== 'ADMIN') {
      router.replace(perfil === 'COZINHA' ? '/cozinha' : '/mesas')
    }
  }, [authLoading, perfil, router])

  const { data: mesas = [], isLoading } = useQuery<Pick<MesaPreset, 'id' | 'nome' | 'ativa' | 'ordem_exibicao'>[]>({
    queryKey: ['admin-mesas', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mesas_preset')
        .select('id, nome, ativa, ordem_exibicao')
        .eq('estabelecimento_id', estabelecimento!.id)
        .order('ordem_exibicao')
      if (error) throw error
      return data ?? []
    },
  })

  const salvar = useMutation({
    mutationFn: async () => {
      const nome = nomeMesa.trim()
      if (!nome) throw new Error('Digite um nome para a mesa.')
      if (editando) {
        const { error } = await supabase
          .from('mesas_preset').update({ nome }).eq('id', editando.id)
        if (error) throw error
      } else {
        const maxOrdem = mesas.length > 0 ? Math.max(...mesas.map(m => m.ordem_exibicao)) : 0
        const { error } = await supabase
          .from('mesas_preset')
          .insert({ estabelecimento_id: estabelecimento!.id, nome, ordem_exibicao: maxOrdem + 1 })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mesas'] })
      qc.invalidateQueries({ queryKey: ['mesas-preset'] })
      setNomeMesa('')
      setEditando(null)
      setShowForm(false)
      toast.success(editando ? 'Mesa atualizada!' : 'Mesa adicionada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleAtiva = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase
        .from('mesas_preset').update({ ativa: !ativa }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-mesas'] }),
    onError: (err: Error) => toast.error(err.message),
  })

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mesas_preset').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mesas'] })
      qc.invalidateQueries({ queryKey: ['mesas-preset'] })
      toast.success('Mesa removida.')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const iniciarEdicao = (mesa: Pick<MesaPreset, 'id' | 'nome' | 'ativa' | 'ordem_exibicao'>) => {
    setEditando(mesa as MesaPreset)
    setNomeMesa(mesa.nome)
    setShowForm(true)
  }

  const cancelar = () => {
    setNomeMesa('')
    setEditando(null)
    setShowForm(false)
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-body)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-3 border-b border-[var(--s-gray-200)] sticky top-0 z-30 pt-safe">
        <button className="btn-ghost p-2" onClick={() => router.push('/admin')} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-extrabold text-lg leading-tight">Mesas</h1>
          <p className="text-xs text-[var(--s-gray-400)]">{mesas.length} cadastradas</p>
        </div>
        <Button
          variant="primary" size="sm"
          onClick={() => { setEditando(null); setNomeMesa(''); setShowForm(true) }}
        >
          <Plus size={16} className="mr-1" />
          Adicionar
        </Button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3">
        {/* Formulário inline */}
        {showForm && (
          <div className="card p-4 flex flex-col gap-3 border-2 border-[var(--p-orange)]">
            <h2 className="font-bold text-sm">{editando ? 'Editar mesa' : 'Nova mesa'}</h2>
            <Input
              label="Nome / Número"
              placeholder="Ex: Mesa 1, Balcão, Deck, Varanda"
              value={nomeMesa}
              onChange={(e) => setNomeMesa(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="primary" size="sm" fullWidth
                loading={salvar.isPending}
                onClick={() => salvar.mutate()}
              >
                {editando ? 'Salvar alterações' : 'Adicionar'}
              </Button>
              <Button variant="secondary" size="sm" fullWidth onClick={cancelar}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de mesas */}
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-16 animate-pulse bg-[var(--s-gray-100)]" />
          ))
        ) : mesas.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-2 text-[var(--s-gray-400)]">
            <p className="font-semibold text-sm">Nenhuma mesa cadastrada</p>
            <p className="text-xs">Toque em &quot;Adicionar&quot; para criar a primeira.</p>
          </div>
        ) : (
          mesas.map((mesa) => (
            <div key={mesa.id} className="card px-4 py-3 flex items-center gap-3">
              <GripVertical size={16} className="text-[var(--s-gray-300)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${!mesa.ativa ? 'line-through text-[var(--s-gray-400)]' : ''}`}>
                  {mesa.nome}
                </p>
                <span className={`text-xs font-medium ${mesa.ativa ? 'text-[var(--success)]' : 'text-[var(--s-gray-400)]'}`}>
                  {mesa.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <button
                className="btn-ghost p-2"
                onClick={() => iniciarEdicao(mesa)}
                aria-label="Editar"
              >
                <Pencil size={15} />
              </button>
              <button
                className="btn-ghost p-2"
                onClick={() => toggleAtiva.mutate({ id: mesa.id, ativa: mesa.ativa })}
                aria-label={mesa.ativa ? 'Desativar mesa' : 'Ativar mesa'}
              >
                {mesa.ativa ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                className="btn-ghost p-2 text-[var(--danger)]"
                onClick={() => {
                  if (confirm(`Remover "${mesa.nome}" permanentemente?`)) excluir.mutate(mesa.id)
                }}
                aria-label="Excluir"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
