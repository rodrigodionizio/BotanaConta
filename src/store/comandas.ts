import { create } from 'zustand'
import { Comanda, ComandaItem } from '@/types'

interface ComandasState {
  comandas: Comanda[]
  comandaAtiva: Comanda | null
  isOnline: boolean

  setComandasAtivas: (comandas: Comanda[]) => void
  setComandaAtiva: (comanda: Comanda | null) => void
  adicionarItemLocal: (item: ComandaItem) => void
  removerItemLocal: (itemId: string) => void
  atualizarTotalLocal: (comandaId: string, total: number) => void
  setOnline: (online: boolean) => void
  updateComanda: (comanda: Comanda) => void
}

export const useComandasStore = create<ComandasState>((set) => ({
  comandas: [],
  comandaAtiva: null,
  isOnline: true,

  setComandasAtivas: (comandas) => set({ comandas }),

  setComandaAtiva: (comanda) => set({ comandaAtiva: comanda }),

  adicionarItemLocal: (item) =>
    set((state) => {
      if (!state.comandaAtiva) return state
      return {
        comandaAtiva: {
          ...state.comandaAtiva,
          itens: [...(state.comandaAtiva.itens ?? []), item],
        },
      }
    }),

  removerItemLocal: (itemId) =>
    set((state) => {
      if (!state.comandaAtiva) return state
      return {
        comandaAtiva: {
          ...state.comandaAtiva,
          itens: state.comandaAtiva.itens?.filter((i) => i.id !== itemId) ?? [],
        },
      }
    }),

  atualizarTotalLocal: (comandaId, total) =>
    set((state) => ({
      comandas: state.comandas.map((c) =>
        c.id === comandaId ? { ...c, total_bruto: total } : c
      ),
    })),

  setOnline: (isOnline) => set({ isOnline }),

  updateComanda: (comanda) =>
    set((state) => ({
      comandas: state.comandas.map((c) => (c.id === comanda.id ? comanda : c)),
      comandaAtiva:
        state.comandaAtiva?.id === comanda.id ? comanda : state.comandaAtiva,
    })),
}))
