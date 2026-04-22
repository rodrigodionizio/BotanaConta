'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AdicionarItemDrawer } from '@/components/garcom/AdicionarItemDrawer'
import { CardapioGrid } from '@/components/garcom/CardapioGrid'
import { PaymentSheet } from '@/components/garcom/PaymentSheet'
import { ConfirmDialog, Drawer } from '@/components/ui/Dialog'
import { useAuthStore } from '@/store/auth'
import { Comanda, Produto } from '@/types'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Receipt, ShoppingBag, X, Printer } from 'lucide-react'
import { conectarImpressora, gerarDocumentoComanda } from '@/lib/impressora'
import { cn } from '@/lib/utils'
import { ProductImage } from '@/components/ui/ProductImage'

interface PageParams { id: string }

const STATUS_CONFIG = {
  ATIVA:        { label: '🟠 Ativa',        bg: 'var(--p-orange)',  text: 'var(--s-black)' },
  CONTA_PEDIDA: { label: '🔴 Conta pedida',  bg: 'var(--danger)',   text: '#fff' },
  FECHADA:      { label: '✅ Fechada',       bg: 'var(--success)',  text: '#fff' },
  CANCELADA:    { label: '❌ Cancelada',     bg: 'var(--s-gray-400)', text: '#fff' },
}

export default function ComandaPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params)
  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [confirmarFechamento, setConfirmarFechamento] = useState(false)
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)
  const { user, estabelecimento, configuracoes, perfil } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  // ── Fetch comanda ─────────────────────────────────────
  const { data: comanda, isLoading } = useQuery<Comanda>({
    queryKey: ['comanda', id],
    refetchInterval: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comandas')
        .select(`
          *,
          itens: comanda_itens(*,
            produto: produtos(*, foto_principal: fotos_produto(url_thumbnail, url_preview, principal)),
            ticket: tickets_cozinha(status)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as Comanda
    },
  })

  // ── Adicionar item ────────────────────────────────────
  const adicionarItem = useMutation({
    mutationFn: async ({ produtoId, quantidade, observacao }: { produtoId: string; quantidade: number; observacao: string }) => {
      const { error } = await supabase.from('comanda_itens').insert({
        comanda_id: id,
        produto_id: produtoId,
        quantidade,
        observacao: observacao || null,
        adicionado_por: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comanda', id] })
      toast.success('Item adicionado!')
      setProdutoSelecionado(null)
    },
    onError: (err: Error) => {
      // Propaga mensagens do banco (ex: comanda não-ATIVA, produto indisponível)
      const detail = (err as { message?: string }).message ?? ''
      const msg = detail.includes('comanda') || detail.includes('Produto')
        ? detail
        : 'Erro ao adicionar item. Tente novamente.'
      toast.error(msg)
    },
  })

  // ── Atualizar quantidade ────────────────────────────
  const atualizarQtd = useMutation({
    mutationFn: async ({ itemId, quantidade }: { itemId: string; quantidade: number }) => {
      if (quantidade <= 0) {
        const { error } = await supabase.from('comanda_itens').update({ status: 'REMOVIDO' }).eq('id', itemId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('comanda_itens').update({ quantidade }).eq('id', itemId)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comanda', id] }),
    onError: (err: Error) => {
      // Propaga mensagem do banco quando item está EM_PREPARO ou PRONTO (trigger A-02)
      const detail = (err as { message?: string }).message ?? ''
      const msg = detail.includes('cozinha') || detail.includes('EM_PREPARO') || detail.includes('PRONTO')
        ? detail
        : 'Erro ao atualizar item. Tente novamente.'
      toast.error(msg)
    },
  })

  // ── Fechar conta ──────────────────────────────────────
  const fecharConta = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('comandas')
        .update({ status: 'CONTA_PEDIDA', conta_pedida_em: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comanda', id] })
      qc.invalidateQueries({ queryKey: ['comandas'] })
      toast.success('Conta pedida! Mesa destacada no painel.')
      router.push('/mesas')
    },
    onError: () => toast.error('Erro ao pedir conta. Tente novamente.'),
  })

  // ── Imprimir conta ──────────────────────────────────────
  const imprimirConta = async () => {
    if (!comanda) return
    const itensAtivosParaImpressao = (comanda.itens ?? []).filter((i) => i.status === 'ATIVO')
    try {
      const printer = await conectarImpressora({ tipo: 'bluetooth' })
      const doc = gerarDocumentoComanda({
        nomeEstabelecimento: estabelecimento?.nome ?? 'Bota na Conta',
        identificacao: comanda.identificacao,
        itens: itensAtivosParaImpressao.map((i) => ({
          nome:       i.produto_nome_snapshot,
          quantidade: i.quantidade,
          precoUnit:  i.preco_unitario_snapshot,
          subtotal:   i.subtotal,
        })),
        subtotal: comanda.total_bruto,
        taxaServicoPct: configuracoes?.taxa_servico_ativa ? (configuracoes.taxa_servico_pct ?? 10) : undefined,
        totalFinal: comanda.total_final ?? comanda.total_bruto,
        abertoEm: comanda.aberta_em,
      })
      await printer.imprimir(doc)
      await printer.desconectar()
      toast.success('Conta enviada para a impressora!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao imprimir')
    }
  }

  // ── Loading ───────────────────────────────────────────
  if (isLoading || !comanda) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--s-black)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--p-orange)] border-t-transparent rounded-full spinner" />
          <p className="text-sm text-white/50">Carregando comanda...</p>
        </div>
      </div>
    )
  }

  const itensAtivos = comanda.itens?.filter((i) => i.status === 'ATIVO') ?? []
  const canEdit = comanda.status === 'ATIVA'
  const statusCfg = STATUS_CONFIG[comanda.status]
  const taxa = configuracoes?.taxa_servico_ativa ? comanda.taxa_servico_valor : 0
  const totalFinal = comanda.total_final ?? comanda.total_bruto

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-body)]">

      {/* ── Header escuro ─────────────────────────────── */}
      <header className="bg-[var(--s-black)] px-5 py-4 shrink-0 pt-safe">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[var(--p-orange)] text-sm font-bold mb-3"
        >
          ← Voltar
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white leading-tight">{comanda.identificacao}</h1>
            <p className="text-xs text-white/50 mt-1">
              Aberta {timeAgo(comanda.aberta_em)}
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-extrabold shrink-0 mt-0.5"
            style={{ background: statusCfg.bg, color: statusCfg.text }}
          >
            {statusCfg.label}
          </span>
        </div>
      </header>

      {/* ── Banner de total ───────────────────────────── */}
      <div className="mx-3.5 -mt-1 rounded-2xl px-5 py-3.5 flex items-center justify-between shrink-0"
        style={{ background: 'var(--p-orange)' }}>
        <div>
          <p className="text-xs font-bold text-white/70 uppercase tracking-wide">Total da comanda</p>
          <p className="text-xs text-white/60 mt-0.5">
            {itensAtivos.length} {itensAtivos.length === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <p className="text-3xl font-black text-white tabular-nums">
          {formatCurrency(comanda.total_bruto)}
        </p>
      </div>

      {/* ── Lista de itens ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-3.5 py-3">

        {itensAtivos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[var(--s-gray-400)]">
            <ShoppingBag size={48} strokeWidth={1.2} />
            <p className="font-semibold text-sm">Comanda vazia</p>
            <p className="text-xs">Toque em + para adicionar itens</p>
          </div>
        ) : (
          <div className="card overflow-hidden mb-3">
            {itensAtivos.map((item, i) => {
              const bloqueado = item.ticket?.status && item.ticket.status !== 'PENDENTE' && item.ticket.status !== 'CANCELADO'
              const ticketBadge = item.ticket?.status === 'EM_PREPARO'
                ? <span className="text-[10px] font-bold text-[var(--warning)]">🔥 Em preparo</span>
                : item.ticket?.status === 'PRONTO'
                  ? <span className="text-[10px] font-bold text-[var(--success)]">✓ Pronto</span>
                  : null

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    i < itensAtivos.length - 1 && 'border-b border-[var(--s-gray-200)]'
                  )}
                >
                  {/* Foto */}
                  <ProductImage
                    src={item.produto?.foto_principal?.url_thumbnail}
                    alt={item.produto_nome_snapshot}
                    size="thumb"
                    className="rounded-xl shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--s-black)] leading-tight truncate">
                      {item.produto_nome_snapshot}
                    </p>
                    <p className="text-xs text-[var(--s-gray-400)] mt-0.5">
                      {formatCurrency(item.preco_unitario_snapshot)} cada
                    </p>
                    {ticketBadge && <div className="mt-0.5">{ticketBadge}</div>}
                  </div>

                  {/* Qty controls */}
                  {canEdit && !bloqueado ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => atualizarQtd.mutate({ itemId: item.id, quantidade: item.quantidade - 1 })}
                        className="w-7 h-7 rounded-lg bg-[var(--s-gray-100)] flex items-center justify-center text-[var(--s-gray-600)] font-black text-base active:scale-90 transition-transform"
                        aria-label="Diminuir"
                      >−</button>
                      <span className="text-base font-black text-[var(--s-black)] min-w-[18px] text-center">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => atualizarQtd.mutate({ itemId: item.id, quantidade: item.quantidade + 1 })}
                        className="w-7 h-7 rounded-lg bg-[var(--p-orange)] flex items-center justify-center text-white font-black text-base active:scale-90 transition-transform"
                        aria-label="Aumentar"
                      >+</button>
                    </div>
                  ) : (
                    <span className="text-sm font-black text-[var(--s-gray-600)] shrink-0">
                      {item.quantidade}×
                    </span>
                  )}

                  {/* Subtotal */}
                  <p className="text-sm font-black text-[var(--s-black)] min-w-[52px] text-right shrink-0 tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Resumo financeiro */}
        {itensAtivos.length > 0 && (
          <div className="card px-4 py-3 mb-3">
            <div className="flex justify-between text-sm py-1.5">
              <span className="text-[var(--s-gray-600)]">Subtotal</span>
              <span className="font-semibold tabular-nums">{formatCurrency(comanda.total_bruto)}</span>
            </div>
            {configuracoes?.taxa_servico_ativa && (
              <div className="flex justify-between text-sm py-1.5 border-t border-[var(--s-gray-200)]">
                <span className="text-[var(--s-gray-600)]">Taxa de serviço ({comanda.taxa_servico_pct}%)</span>
                <span className="font-semibold tabular-nums">{formatCurrency(taxa ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between mt-1 pt-2 border-t border-[var(--s-gray-200)]">
              <span className="font-extrabold text-base">Total</span>
              <span className="font-black text-xl text-[var(--p-orange)] tabular-nums">
                {formatCurrency(totalFinal)}
              </span>
            </div>
          </div>
        )}

        {/* Conta pedida info */}
        {comanda.status === 'CONTA_PEDIDA' && (
          <div className="card px-4 py-3 mb-3 bg-[var(--danger-light)] border border-[var(--danger)]">
            <p className="font-bold text-[var(--danger)] text-sm">🔴 Conta pedida</p>
            <p className="text-xs text-[var(--s-gray-600)] mt-1">
              Aguardando pagamento. Novos itens bloqueados.
            </p>
          </div>
        )}
      </main>

      {/* ── FAB adicionar ─────────────────────────────── */}
      {canEdit && (
        <button
          className="fab"
          onClick={() => setCatalogoOpen(true)}
          aria-label="Adicionar item"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* ── Barra de ações ────────────────────────────── */}
      <div className="flex gap-2.5 px-3.5 py-3 bg-[var(--bg-surface)] border-t border-[var(--s-gray-200)] shrink-0 pb-safe">
        {canEdit && (
          <button
            className="btn-secondary flex-1 text-sm font-bold flex items-center justify-center gap-2"
            onClick={() => setCatalogoOpen(true)}
          >
            <Plus size={18} />
            Item
          </button>
        )}
        {itensAtivos.length > 0 && (
          <button
            className="btn-secondary flex-1 text-sm font-bold flex items-center justify-center gap-2"
            onClick={imprimirConta}
          >
            <Printer size={18} />
            Imprimir
          </button>
        )}
        {canEdit && itensAtivos.length > 0 &&
          (perfil === 'ADMIN' || configuracoes?.permite_garcom_fechar_conta === true) && (
          <button
            className="btn-danger flex-1 text-sm font-bold flex items-center justify-center gap-2"
            onClick={() => setConfirmarFechamento(true)}
          >
            <Receipt size={18} />
            Fechar Conta
          </button>
        )}
        {comanda.status === 'CONTA_PEDIDA' && (
          <button
            className="flex-1 min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all active:scale-95"
            style={{ background: 'var(--success)' }}
            onClick={() => setPaymentSheetOpen(true)}
          >
            <Receipt size={18} />
            Registrar Pagamento
          </button>
        )}
      </div>

      {/* Sheet catálogo */}
      <Drawer open={catalogoOpen} onClose={() => setCatalogoOpen(false)} title="Adicionar item">
        {estabelecimento?.id && (
          <CardapioGrid
            estabelecimentoId={estabelecimento.id}
            onSelect={(produto) => {
              setCatalogoOpen(false)
              setProdutoSelecionado(produto)
            }}
          />
        )}
      </Drawer>

      {/* Drawer de confirmação de item */}
      <AdicionarItemDrawer
        open={!!produtoSelecionado}
        onClose={() => setProdutoSelecionado(null)}
        produto={produtoSelecionado}
        onConfirm={(produtoId, quantidade, observacao) =>
          adicionarItem.mutateAsync({ produtoId, quantidade, observacao })
        }
      />

      {/* Confirm fechar conta (ATIVA → CONTA_PEDIDA) */}
      <ConfirmDialog
        open={confirmarFechamento}
        onClose={() => setConfirmarFechamento(false)}
        onConfirm={() => fecharConta.mutate()}
        title="Fechar conta?"
        message={`Total: ${formatCurrency(totalFinal)}. Confirme para solicitar o pagamento. Novos itens serão bloqueados.`}
        confirmLabel="Fechar conta"
        loading={fecharConta.isPending}
      />

      {/* Payment sheet (CONTA_PEDIDA → FECHADA) */}
      {comanda.status === 'CONTA_PEDIDA' && (
        <PaymentSheet
          open={paymentSheetOpen}
          onClose={() => setPaymentSheetOpen(false)}
          comanda={comanda}
        />
      )}
    </div>
  )
}

