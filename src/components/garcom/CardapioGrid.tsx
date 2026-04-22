'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ProductImage } from '@/components/ui/ProductImage'
import { Produto, CategoriaProduto } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CardapioGridProps {
  estabelecimentoId: string
  onSelect: (produto: Produto) => void
}

export function CardapioGrid({ estabelecimentoId, onSelect }: CardapioGridProps) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const supabase = createClient()

  const { data: categorias = [] } = useQuery<CategoriaProduto[]>({
    queryKey: ['categorias', estabelecimentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_produto')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativa', true)
        .order('ordem_exibicao')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: produtos = [], isLoading } = useQuery<Produto[]>({
    queryKey: ['produtos', estabelecimentoId, categoriaAtiva],
    queryFn: async () => {
      let query = supabase
        .from('produtos')
        .select(`
          *,
          categoria: categorias_produto(*),
          foto_principal: fotos_produto(url_thumbnail, url_preview, url_original, principal)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('disponivel', true)
        .order('ordem_exibicao')

      if (categoriaAtiva) {
        query = query.eq('categoria_id', categoriaAtiva)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as Produto[]
    },
  })

  const produtosFiltrados = produtos.filter((p) =>
    busca
      ? p.nome.toLowerCase().includes(busca.toLowerCase())
      : true
  )

  return (
    <div className="flex flex-col h-full">
      {/* Busca */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--s-gray-400)]"
          />
          <input
            className="input pl-9 text-sm"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Filtro por categoria */}
      {!busca && categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 border-2 transition-colors',
              !categoriaAtiva
                ? 'bg-[var(--p-orange)] border-[var(--p-orange)] text-white'
                : 'bg-white border-[var(--s-gray-200)] text-[var(--s-black)]'
            )}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 border-2 transition-colors',
                categoriaAtiva === cat.id
                  ? 'bg-[var(--p-orange)] border-[var(--p-orange)] text-white'
                  : 'bg-white border-[var(--s-gray-200)] text-[var(--s-black)]'
              )}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      )}

      {/* Grid de produtos */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-48 animate-pulse bg-[var(--s-gray-100)]" />
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-[var(--s-gray-400)]">
            <Search size={40} strokeWidth={1.5} />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {produtosFiltrados.map((produto) => (
              <button
                key={produto.id}
                className="card text-left overflow-hidden active:scale-95 transition-transform"
                onClick={() => onSelect(produto)}
                aria-label={`Adicionar ${produto.nome}`}
              >
                {/* Foto */}
                <ProductImage
                  src={produto.foto_principal?.url_thumbnail}
                  alt={produto.nome}
                  size="card"
                  categoriaCorHex={produto.categoria?.cor_hex}
                  className="rounded-none"
                />
                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-bold text-[var(--s-black)] leading-tight line-clamp-2">
                    {produto.nome}
                  </p>
                  {produto.descricao && (
                    <p className="text-xs text-[var(--s-gray-400)] mt-0.5 line-clamp-1">
                      {produto.descricao}
                    </p>
                  )}
                  <p className="text-base font-extrabold text-[var(--p-orange)] mt-1.5 tabular-nums">
                    {formatCurrency(produto.preco)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
