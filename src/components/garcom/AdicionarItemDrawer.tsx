'use client'

import { useState } from 'react'
import { Drawer } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { ProductImage } from '@/components/ui/ProductImage'
import { Produto, CategoriaProduto } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdicionarItemDrawerProps {
  open: boolean
  onClose: () => void
  produto: Produto | null
  onConfirm: (produtoId: string, quantidade: number, observacao: string) => Promise<void>
}

export function AdicionarItemDrawer({
  open,
  onClose,
  produto,
  onConfirm,
}: AdicionarItemDrawerProps) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setQuantidade(1)
    setObservacao('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!produto) return
    setLoading(true)
    try {
      await onConfirm(produto.id, quantidade, observacao)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  if (!produto) return null

  const categoria = produto.categoria as CategoriaProduto | undefined
  const total = produto.preco * quantidade

  return (
    <Drawer open={open} onClose={handleClose} className="pb-safe">
      <div className="drawer-handle" />

      {/* Foto do produto */}
      <div className="px-5 pt-4">
        <ProductImage
          src={produto.foto_principal?.url_preview ?? produto.foto_principal?.url_original}
          alt={produto.nome}
          size="preview"
          categoriaCorHex={categoria?.cor_hex}
          className="rounded-2xl mb-4"
        />

        <h2 className="text-xl font-bold text-[var(--s-black)] mb-1">{produto.nome}</h2>
        {produto.descricao && (
          <p className="text-sm text-[var(--s-gray-600)] mb-2">{produto.descricao}</p>
        )}

        {/* Tipo de preparo badge */}
        {produto.vai_para_cozinha && produto.tipo_preparo && (
          <span className={cn('badge text-xs mb-4', `prep-${produto.tipo_preparo.toLowerCase()}`)}>
            → Vai para cozinha
          </span>
        )}

        <p className="text-2xl font-extrabold text-[var(--p-orange)] mb-5">
          {formatCurrency(produto.preco)}
          <span className="text-sm font-normal text-[var(--s-gray-400)] ml-1">/ unidade</span>
        </p>

        {/* Seletor de quantidade */}
        <div className="flex items-center justify-between mb-4 bg-[var(--s-gray-100)] rounded-2xl p-1">
          <button
            className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--s-black)] hover:bg-[var(--s-gray-200)] transition-colors disabled:opacity-40"
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            disabled={quantidade <= 1}
            aria-label="Diminuir quantidade"
          >
            <Minus size={20} />
          </button>
          <span className="text-2xl font-extrabold text-[var(--s-black)] tabular-nums w-16 text-center">
            {quantidade}
          </span>
          <button
            className="w-12 h-12 rounded-xl flex items-center justify-center text-[var(--s-black)] hover:bg-[var(--s-gray-200)] transition-colors"
            onClick={() => setQuantidade((q) => q + 1)}
            aria-label="Aumentar quantidade"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Observação */}
        <Textarea
          label="Observação (opcional)"
          placeholder='Ex: sem cebola, bem passado, sem pimenta...'
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          maxLength={80}
          hint={`${observacao.length}/80 caracteres`}
          className="mb-5"
        />

        {/* Total + Confirmar */}
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-[var(--s-gray-400)]">Total</p>
            <p className="text-lg font-extrabold text-[var(--s-black)] tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            onClick={handleConfirm}
            className="flex-1"
          >
            Adicionar à comanda
          </Button>
        </div>
      </div>

      <div className="h-6" />
    </Drawer>
  )
}
