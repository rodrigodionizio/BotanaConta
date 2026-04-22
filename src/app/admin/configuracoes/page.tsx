'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Percent, Bell, ChefHat, DollarSign, Clock } from 'lucide-react'

interface Configuracoes {
  id: string
  taxa_servico_pct: number
  taxa_servico_ativa: boolean
  tempo_ticket_pronto_visivel_min: number
  permite_garcom_fechar_conta: boolean
  permite_garcom_aplicar_desconto: boolean
  alerta_sonoro_cozinha: boolean
}

function ToggleRow({
  label,
  descricao,
  checked,
  onChange,
  icon,
}: {
  label: string
  descricao?: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full text-left"
      onClick={() => onChange(!checked)}
    >
      {icon && (
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--s-gray-100)] text-[var(--s-gray-500)]">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {descricao && <p className="text-xs text-[var(--s-gray-400)]">{descricao}</p>}
      </div>
      {/* Toggle visual */}
      <div
        className="w-11 h-6 rounded-full relative transition-colors shrink-0"
        style={{ background: checked ? 'var(--p-orange)' : 'var(--s-gray-300)' }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </div>
    </button>
  )
}

export default function AdminConfiguracoesPage() {
  const router = useRouter()
  const { estabelecimento, perfil: perfilAtual, isLoading: authLoading } = useAuthStore()
  const supabase = createClient()
  const qc = useQueryClient()

  const [form, setForm] = useState<Omit<Configuracoes, 'id'>>({
    taxa_servico_pct: 10,
    taxa_servico_ativa: false,
    tempo_ticket_pronto_visivel_min: 10,
    permite_garcom_fechar_conta: true,
    permite_garcom_aplicar_desconto: false,
    alerta_sonoro_cozinha: true,
  })
  const [salvo, setSalvo] = useState(false)

  // Guarda de perfil
  useEffect(() => {
    if (!authLoading && perfilAtual !== null && perfilAtual !== 'ADMIN') {
      router.replace(perfilAtual === 'COZINHA' ? '/cozinha' : '/mesas')
    }
  }, [authLoading, perfilAtual, router])

  const { isLoading, data: configData } = useQuery<Configuracoes>({
    queryKey: ['admin-config', estabelecimento?.id],
    enabled: !!estabelecimento?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_estabelecimento')
        .select('*')
        .eq('estabelecimento_id', estabelecimento!.id)
        .single()
      if (error) throw error
      return data as Configuracoes
    },
  })

  // Sincroniza form quando dados chegam do banco
  useEffect(() => {
    if (configData) {
      setForm({
        taxa_servico_pct: configData.taxa_servico_pct,
        taxa_servico_ativa: configData.taxa_servico_ativa,
        tempo_ticket_pronto_visivel_min: configData.tempo_ticket_pronto_visivel_min,
        permite_garcom_fechar_conta: configData.permite_garcom_fechar_conta,
        permite_garcom_aplicar_desconto: configData.permite_garcom_aplicar_desconto,
        alerta_sonoro_cozinha: configData.alerta_sonoro_cozinha,
      })
    }
  }, [configData])

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('configuracoes_estabelecimento')
        .update({
          taxa_servico_pct: form.taxa_servico_pct,
          taxa_servico_ativa: form.taxa_servico_ativa,
          tempo_ticket_pronto_visivel_min: form.tempo_ticket_pronto_visivel_min,
          permite_garcom_fechar_conta: form.permite_garcom_fechar_conta,
          permite_garcom_aplicar_desconto: form.permite_garcom_aplicar_desconto,
          alerta_sonoro_cozinha: form.alerta_sonoro_cozinha,
        })
        .eq('estabelecimento_id', estabelecimento!.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-config'] })
      toast.success('Configurações salvas!')
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    },
    onError: (err: Error) => toast.error('Erro ao salvar: ' + err.message),
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="min-h-dvh bg-[var(--bg-body)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-3 border-b border-[var(--s-gray-200)] sticky top-0 z-30 pt-safe">
        <button className="btn-ghost p-2" onClick={() => router.push('/admin')} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-extrabold text-lg flex-1">Configurações</h1>
        <Button
          variant={salvo ? 'secondary' : 'primary'}
          size="sm"
          loading={salvar.isPending}
          onClick={() => salvar.mutate()}
        >
          <Save size={16} className="mr-1" />
          {salvo ? 'Salvo!' : 'Salvar'}
        </Button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-[var(--s-gray-100)]" />
          ))
        ) : (
          <>
            {/* Taxa de serviço */}
            <div className="card p-4 flex flex-col gap-4">
              <h2 className="font-bold text-sm text-[var(--s-gray-600)] uppercase tracking-wide">
                Taxa de Serviço
              </h2>
              <ToggleRow
                label="Cobrar taxa de serviço"
                descricao="Adiciona percentual automático ao total"
                checked={form.taxa_servico_ativa}
                onChange={(v) => set('taxa_servico_ativa', v)}
                icon={<DollarSign size={18} />}
              />
              {form.taxa_servico_ativa && (
                <Input
                  label="Percentual (%)"
                  type="number"
                  placeholder="10"
                  value={form.taxa_servico_pct.toString()}
                  onChange={(e) => set('taxa_servico_pct', parseFloat(e.target.value) || 0)}
                  hint="Ex: 10 = 10% sobre o total bruto"
                />
              )}
            </div>

            {/* Permissões dos garçons */}
            <div className="card p-4 flex flex-col gap-4">
              <h2 className="font-bold text-sm text-[var(--s-gray-600)] uppercase tracking-wide">
                Permissões dos Garçons
              </h2>
              <ToggleRow
                label="Garçom pode fechar conta"
                descricao="Permite registrar pagamento e fechar comanda"
                checked={form.permite_garcom_fechar_conta}
                onChange={(v) => set('permite_garcom_fechar_conta', v)}
                icon={<DollarSign size={18} />}
              />
              <div className="border-t border-[var(--s-gray-100)]" />
              <ToggleRow
                label="Garçom pode aplicar desconto"
                descricao="Permite reduzir o valor total antes de fechar"
                checked={form.permite_garcom_aplicar_desconto}
                onChange={(v) => set('permite_garcom_aplicar_desconto', v)}
                icon={<Percent size={18} />}
              />
            </div>

            {/* Cozinha */}
            <div className="card p-4 flex flex-col gap-4">
              <h2 className="font-bold text-sm text-[var(--s-gray-600)] uppercase tracking-wide">
                Cozinha
              </h2>
              <ToggleRow
                label="Alerta sonoro"
                descricao="Toca um som ao receber novo pedido"
                checked={form.alerta_sonoro_cozinha}
                onChange={(v) => set('alerta_sonoro_cozinha', v)}
                icon={<Bell size={18} />}
              />
              <div className="border-t border-[var(--s-gray-100)]" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--s-gray-100)] text-[var(--s-gray-500)]">
                  <Clock size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Tempo ticket &quot;Pronto&quot; visível</p>
                  <p className="text-xs text-[var(--s-gray-400)]">Minutos que o ticket fica na tela após pronto</p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.tempo_ticket_pronto_visivel_min}
                  onChange={(e) => set('tempo_ticket_pronto_visivel_min', parseInt(e.target.value) || 5)}
                  className="w-16 text-center font-bold text-sm rounded-xl border border-[var(--s-gray-200)] bg-[var(--bg-body)] py-1.5"
                  aria-label="Minutos"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[var(--s-gray-100)] text-[var(--s-gray-500)]">
                  <ChefHat size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Modo cozinha</p>
                  <p className="text-xs text-[var(--s-gray-400)]">Tela escura com tickets grandes</p>
                </div>
                <button
                  className="text-xs text-[var(--info)] font-semibold"
                  onClick={() => router.push('/cozinha')}
                >
                  Abrir →
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
