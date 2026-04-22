'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Produto, CategoriaProduto, TipoPreparo } from '@/types'
import { ProductImage } from '@/components/ui/ProductImage'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal, ConfirmDialog } from '@/components/ui/Dialog'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Pencil, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPOS_PREPARO: { value: TipoPreparo | 'NENHUM'; label: string }[] = [
  { value: 'NENHUM',   label: 'Não vai para cozinha' },
  { value: 'FRITAR',   label: '🟠 Fritar' },
  { value: 'ASSAR',    label: '🔴 Assar/Grelhar' },
  { value: 'COZINHAR', label: '🔵 Cozinhar' },
  { value: 'ESQUENTAR',label: '🟡 Esquentar' },
  { value: 'MONTAR',   label: '🟢 Montar' },
]

interface FormProduto {
  nome: string
  descricao: string
  preco: string
  categoria_id: string
  tipo_preparo: TipoPreparo | 'NENHUM'
  disponivel: boolean
}

const FORM_VAZIO: FormProduto = {
  nome: '',
  descricao: '',
  preco: '',
  categoria_id: '',
  tipo_preparo: 'NENHUM',
  disponivel: true,
}

// ── Tipos e constantes de categorias ─────────────────────
const CORES_PRESET = [
  '#F97316', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981',
  '#F59E0B', '#EC4899', '#6B7280', '#14B8A6', '#84CC16',
]

interface FormCategoria {
  nome: string
  cor_hex: string
  vai_para_cozinha_padrao: boolean
  tipo_preparo_padrao: TipoPreparo | 'NENHUM'
}

const FORM_CAT_VAZIO: FormCategoria = {
  nome: '',
  cor_hex: '#F97316',
  vai_para_cozinha_padrao: false,
  tipo_preparo_padrao: 'NENHUM',
}

export default function CardapioAdminPage() {
  // ── Estado Produtos ──────────────────────────────────
  const [tab, setTab] = useState<'produtos' | 'categorias'>('produtos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [form, setForm] = useState<FormProduto>(FORM_VAZIO)
  const [confirmarDes, setConfirmarDes] = useState<Produto | null>(null)

  // ── Estado Categorias ────────────────────────────────
  const [modalCatOpen, setModalCatOpen] = useState(false)
  const [editandoCat, setEditandoCat] = useState<CategoriaProduto | null>(null)
  const [formCat, setFormCat] = useState<FormCategoria>(FORM_CAT_VAZIO)

  const { estabelecimento } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  const { data: categorias = [] } = useQuery<CategoriaProduto[]>({
    queryKey: ['categorias', estabelecimento?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('categorias_produto')
        .select('*')
        .eq('estabelecimento_id', estabelecimento!.id)
        .eq('ativa', true)
        .order('ordem_exibicao')
      return data ?? []
    },
  })

  const { data: produtos = [], isLoading } = useQuery<Produto[]>({
    queryKey: ['produtos-admin', estabelecimento?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('produtos')
        .select('*, categoria: categorias_produto(*), foto_principal: fotos_produto(url_thumbnail, principal)')
        .eq('estabelecimento_id', estabelecimento!.id)
        .order('ordem_exibicao')
      return (data ?? []) as unknown as Produto[]
    },
  })

  const salvarProduto = useMutation({
    mutationFn: async () => {
      const vai_para_cozinha = form.tipo_preparo !== 'NENHUM'
      const tipo_preparo: TipoPreparo | null = vai_para_cozinha
        ? (form.tipo_preparo as TipoPreparo)
        : null

      if (editando) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('produtos') as any)
          .update({
            nome: form.nome,
            descricao: form.descricao || null,
            preco: parseFloat(form.preco),
            categoria_id: form.categoria_id || null,
            vai_para_cozinha,
            tipo_preparo,
            disponivel: form.disponivel,
          })
          .eq('id', editando.id)
        if (error) throw error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('produtos') as any)
          .insert({
            estabelecimento_id: estabelecimento!.id,
            nome: form.nome,
            descricao: form.descricao || null,
            preco: parseFloat(form.preco),
            categoria_id: form.categoria_id || null,
            vai_para_cozinha,
            tipo_preparo,
            disponivel: form.disponivel,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos-admin'] })
      qc.invalidateQueries({ queryKey: ['produtos'] })
      toast.success(editando ? 'Produto salvo!' : 'Produto criado!')
      setModalOpen(false)
      setEditando(null)
      setForm(FORM_VAZIO)
    },
    onError: () => toast.error('Erro ao salvar produto'),
  })

  const toggleDisponivel = useMutation({
    mutationFn: async (produto: Produto) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('produtos') as any)
        .update({ disponivel: !produto.disponivel })
        .eq('id', produto.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos-admin'] })
      toast.success('Status do produto atualizado')
    },
  })

  const abrirEdicao = (produto: Produto) => {
    setEditando(produto)
    setForm({
      nome: produto.nome,
      descricao: produto.descricao ?? '',
      preco: produto.preco.toString(),
      categoria_id: produto.categoria_id ?? '',
      tipo_preparo: produto.vai_para_cozinha
        ? (produto.tipo_preparo as TipoPreparo) ?? 'NENHUM'
        : 'NENHUM',
      disponivel: produto.disponivel,
    })
    setModalOpen(true)
  }

  // ── Mutations categorias ────────────────────────────
  const salvarCategoria = useMutation({
    mutationFn: async () => {
      const tipo_preparo_padrao = formCat.vai_para_cozinha_padrao && formCat.tipo_preparo_padrao !== 'NENHUM'
        ? formCat.tipo_preparo_padrao as TipoPreparo
        : null

      if (editandoCat) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('categorias_produto') as any)
          .update({
            nome: formCat.nome,
            cor_hex: formCat.cor_hex,
            vai_para_cozinha_padrao: formCat.vai_para_cozinha_padrao,
            tipo_preparo_padrao,
          })
          .eq('id', editandoCat.id)
        if (error) throw error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('categorias_produto') as any)
          .insert({
            estabelecimento_id: estabelecimento!.id,
            nome: formCat.nome,
            cor_hex: formCat.cor_hex,
            vai_para_cozinha_padrao: formCat.vai_para_cozinha_padrao,
            tipo_preparo_padrao,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      toast.success(editandoCat ? 'Categoria salva!' : 'Categoria criada!')
      setModalCatOpen(false)
      setEditandoCat(null)
      setFormCat(FORM_CAT_VAZIO)
    },
    onError: () => toast.error('Erro ao salvar categoria'),
  })

  const toggleAtivaCategoria = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('categorias_produto') as any)
        .update({ ativa: !ativa })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      toast.success('Status da categoria atualizado')
    },
  })

  const abrirEdicaoCat = (cat: CategoriaProduto) => {
    setEditandoCat(cat)
    setFormCat({
      nome: cat.nome,
      cor_hex: cat.cor_hex ?? '#F97316',
      vai_para_cozinha_padrao: cat.vai_para_cozinha_padrao,
      tipo_preparo_padrao: cat.vai_para_cozinha_padrao && cat.tipo_preparo_padrao
        ? cat.tipo_preparo_padrao
        : 'NENHUM',
    })
    setModalCatOpen(true)
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-body)] flex flex-col">
      <header className="bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-3 border-b border-[var(--s-gray-200)] sticky top-0 z-30 pt-safe">
        <button className="btn-ghost p-2" onClick={() => router.back()} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-extrabold text-lg flex-1">Cardápio</h1>
        {tab === 'produtos' ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setEditando(null); setForm(FORM_VAZIO); setModalOpen(true) }}
          >
            <Plus size={16} /> Novo
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setEditandoCat(null); setFormCat(FORM_CAT_VAZIO); setModalCatOpen(true) }}
          >
            <Plus size={16} /> Nova
          </Button>
        )}
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--s-gray-200)] bg-[var(--bg-surface)] sticky top-[57px] z-20">
        {(['produtos', 'categorias'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-3 text-sm font-bold capitalize transition-colors border-b-2',
              tab === t
                ? 'border-[var(--p-orange)] text-[var(--p-orange)]'
                : 'border-transparent text-[var(--s-gray-400)]'
            )}
          >
            {t === 'produtos' ? 'Produtos' : 'Categorias'}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4">
        {/* ── Aba Produtos ──────────────────────── */}
        {tab === 'produtos' && (
        isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-20 animate-pulse bg-[var(--s-gray-100)]" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {produtos.map((produto) => (
              <div key={produto.id} className={cn('card p-3 flex items-center gap-3', !produto.disponivel && 'opacity-60')}>
                <ProductImage
                  src={produto.foto_principal?.url_thumbnail}
                  alt={produto.nome}
                  size="thumb"
                  categoriaCorHex={produto.categoria?.cor_hex}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{produto.nome}</p>
                  <p className="text-xs text-[var(--s-gray-400)]">
                    {produto.categoria?.nome ?? 'Sem categoria'}
                  </p>
                  <p className="text-sm font-extrabold text-[var(--p-orange)] tabular-nums">
                    {formatCurrency(produto.preco)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    className="btn-ghost p-2"
                    onClick={() => toggleDisponivel.mutate(produto)}
                    aria-label={produto.disponivel ? 'Desativar' : 'Ativar'}
                  >
                    {produto.disponivel ? <Eye size={18} /> : <EyeOff size={18} className="text-[var(--s-gray-400)]" />}
                  </button>
                  <button
                    className="btn-ghost p-2"
                    onClick={() => abrirEdicao(produto)}
                    aria-label="Editar produto"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
        )}

        {/* ── Aba Categorias ───────────────────────── */}
        {tab === 'categorias' && (
          categorias.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-2 text-[var(--s-gray-400)]">
              <p className="font-semibold text-sm">Nenhuma categoria criada</p>
              <p className="text-xs">Toque em &quot;+ Nova&quot; para adicionar</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {categorias.map((cat) => (
                <div
                  key={cat.id}
                  className={cn('card p-4 flex items-center gap-3', !cat.ativa && 'opacity-60')}
                >
                  {/* Círculo com cor */}
                  <div
                    className="w-10 h-10 rounded-full shrink-0 border-2 border-white shadow"
                    style={{ background: cat.cor_hex ?? '#94A3B8' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{cat.nome}</p>
                    {cat.vai_para_cozinha_padrao && (
                      <p className="text-xs text-[var(--s-gray-400)]">
                        🍳 Vai para cozinha
                        {cat.tipo_preparo_padrao ? ` · ${cat.tipo_preparo_padrao}` : ''}
                      </p>
                    )}
                    {!cat.vai_para_cozinha_padrao && (
                      <p className="text-xs text-[var(--s-gray-400)]">Não vai para cozinha</p>
                    )}
                  </div>
                  <button
                    className="btn-ghost p-2"
                    onClick={() => abrirEdicaoCat(cat)}
                    aria-label="Editar categoria"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="btn-ghost p-2"
                    onClick={() => toggleAtivaCategoria.mutate({ id: cat.id, ativa: cat.ativa })}
                    aria-label={cat.ativa ? 'Desativar' : 'Ativar'}
                  >
                    {cat.ativa
                      ? <Eye size={18} />
                      : <EyeOff size={18} className="text-[var(--s-gray-400)]" />
                    }
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Modal criar/editar produto */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        title={editando ? 'Editar produto' : 'Novo produto'}
      >
        <form
          className="p-5 flex flex-col gap-4 pb-safe"
          onSubmit={(e) => { e.preventDefault(); salvarProduto.mutate() }}
        >
          <Input
            label="Nome *"
            placeholder="Espetinho de Medalhão"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            maxLength={60}
            required
          />
          <Textarea
            label="Descrição (opcional)"
            placeholder="Descrição curta..."
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            maxLength={120}
          />
          <Input
            label="Preço (R$) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={form.preco}
            onChange={(e) => setForm({ ...form, preco: e.target.value })}
            required
          />

          {/* Categoria */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Categoria</label>
            <select
              className="input"
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
            >
              <option value="">Sem categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          {/* Tipo de preparo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Preparo / Cozinha *</label>
            <select
              className="input"
              value={form.tipo_preparo}
              onChange={(e) => setForm({ ...form, tipo_preparo: e.target.value as TipoPreparo | 'NENHUM' })}
            >
              {TIPOS_PREPARO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Disponível */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.disponivel}
                onChange={(e) => setForm({ ...form, disponivel: e.target.checked })}
              />
              <div className={cn(
                'w-12 h-6 rounded-full transition-colors',
                form.disponivel ? 'bg-[var(--success)]' : 'bg-[var(--s-gray-300)]'
              )}>
                <div className={cn(
                  'w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform',
                  form.disponivel ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </div>
            </div>
            <span className="text-sm font-semibold">
              {form.disponivel ? 'Visível no cardápio' : 'Oculto do cardápio'}
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={salvarProduto.isPending}
            disabled={!form.nome || !form.preco}
          >
            {editando ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </form>
      </Modal>

      {/* Modal criar/editar categoria */}
      <Modal
        open={modalCatOpen}
        onClose={() => { setModalCatOpen(false); setEditandoCat(null) }}
        title={editandoCat ? 'Editar categoria' : 'Nova categoria'}
      >
        <form
          className="p-5 flex flex-col gap-4 pb-safe"
          onSubmit={(e) => { e.preventDefault(); salvarCategoria.mutate() }}
        >
          <Input
            label="Nome *"
            placeholder="Espetinhos, Bebidas..."
            value={formCat.nome}
            onChange={(e) => setFormCat({ ...formCat, nome: e.target.value })}
            maxLength={40}
            required
          />

          {/* Cor */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Cor de destaque</label>
            <div className="flex gap-2 flex-wrap">
              {CORES_PRESET.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setFormCat({ ...formCat, cor_hex: cor })}
                  className={cn(
                    'w-9 h-9 rounded-full border-4 transition-transform',
                    formCat.cor_hex === cor
                      ? 'border-[var(--s-black)] scale-110'
                      : 'border-transparent'
                  )}
                  style={{ background: cor }}
                  aria-label={`Cor ${cor}`}
                />
              ))}
            </div>
          </div>

          {/* Vai para cozinha */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={formCat.vai_para_cozinha_padrao}
                onChange={(e) => setFormCat({
                  ...formCat,
                  vai_para_cozinha_padrao: e.target.checked,
                  tipo_preparo_padrao: e.target.checked ? formCat.tipo_preparo_padrao : 'NENHUM',
                })}
              />
              <div className={cn(
                'w-12 h-6 rounded-full transition-colors',
                formCat.vai_para_cozinha_padrao ? 'bg-[var(--success)]' : 'bg-[var(--s-gray-300)]'
              )}>
                <div className={cn(
                  'w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform',
                  formCat.vai_para_cozinha_padrao ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </div>
            </div>
            <span className="text-sm font-semibold">Vai para cozinha (padrão)</span>
          </label>

          {/* Tipo de preparo (apenas quando vai para cozinha) */}
          {formCat.vai_para_cozinha_padrao && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Tipo de preparo padrão</label>
              <select
                className="input"
                value={formCat.tipo_preparo_padrao}
                onChange={(e) => setFormCat({ ...formCat, tipo_preparo_padrao: e.target.value as TipoPreparo | 'NENHUM' })}
              >
                {TIPOS_PREPARO.filter(t => t.value !== 'NENHUM').map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={salvarCategoria.isPending}
            disabled={!formCat.nome}
          >
            {editandoCat ? 'Salvar alterações' : 'Criar categoria'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
