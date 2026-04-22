'use client'

import { useState, useEffect } from 'react'
import { Drawer } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MesaPreset } from '@/types'
import { validarIdentificacao } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface NovaComandaDrawerProps {
  open: boolean
  onClose: () => void
  onConfirm: (identificacao: string) => Promise<void>
  mesas: MesaPreset[]
  comandasAbertasNomes: string[]
  initialValue?: string
}

export function NovaComandaDrawer({
  open,
  onClose,
  onConfirm,
  mesas,
  comandasAbertasNomes,
  initialValue = '',
}: NovaComandaDrawerProps) {
  const [identificacao, setIdentificacao] = useState(initialValue)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sincroniza campo ao abrir o drawer (suporte a pré-seleção de mesa)
  useEffect(() => {
    if (open) {
      setIdentificacao(initialValue)
      setErro(null)
    }
  }, [open, initialValue])

  const handleSubmit = async () => {
    const erroValidacao = validarIdentificacao(identificacao)
    if (erroValidacao) return setErro(erroValidacao)

    const nomeNorm = identificacao.trim().toLowerCase()
    const duplicado = comandasAbertasNomes.some(
      (n) => n.toLowerCase() === nomeNorm
    )
    if (duplicado) {
      return setErro('Já existe uma comanda aberta com esse nome. Escolha outro identificador.')
    }

    setErro(null)
    setLoading(true)
    try {
      await onConfirm(identificacao.trim())
      setIdentificacao('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSugestao = (nome: string) => {
    setIdentificacao(nome)
    setErro(null)
  }

  const mesasDisponiveis = mesas.filter(
    (m) => m.ativa && !comandasAbertasNomes.some(
      (n) => n.toLowerCase() === m.nome.toLowerCase()
    )
  )

  const mesasOcupadas = mesas.filter(
    (m) => m.ativa && comandasAbertasNomes.some(
      (n) => n.toLowerCase() === m.nome.toLowerCase()
    )
  )

  return (
    <Drawer open={open} onClose={onClose} title="Nova comanda">
      <div className="p-5 pb-safe flex flex-col gap-5">
        <Input
          label="Identificação da mesa"
          placeholder='Ex: Mesa 3, João, Família Silva, Balcão...'
          value={identificacao}
          onChange={(e) => {
            setIdentificacao(e.target.value)
            setErro(null)
          }}
          error={erro ?? undefined}
          maxLength={30}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {/* Atalhos de mesas pré-cadastradas */}
        {mesas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--s-gray-600)] uppercase tracking-wide mb-2">
              Sugestões
            </p>
            <div className="flex flex-wrap gap-2">
              {mesasDisponiveis.map((mesa) => (
                <button
                  key={mesa.id}
                  onClick={() => handleSugestao(mesa.nome)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors',
                    identificacao === mesa.nome
                      ? 'bg-[var(--p-orange)] border-[var(--p-orange)] text-white'
                      : 'bg-white border-[var(--s-gray-200)] text-[var(--s-black)] hover:border-[var(--p-orange)] hover:text-[var(--p-orange)]'
                  )}
                >
                  {mesa.nome}
                </button>
              ))}
              {mesasOcupadas.map((mesa) => (
                <button
                  key={mesa.id}
                  disabled
                  className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 bg-[var(--s-gray-100)] border-[var(--s-gray-200)] text-[var(--s-gray-400)] cursor-not-allowed"
                >
                  {mesa.nome} •
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onClick={handleSubmit}
          disabled={!identificacao.trim()}
        >
          Abrir comanda
        </Button>
      </div>
    </Drawer>
  )
}
