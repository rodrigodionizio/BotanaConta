import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Usuario, Estabelecimento, ConfiguracoesEstabelecimento, PerfilUsuario } from '@/types'

interface AuthState {
  user: Usuario | null
  estabelecimento: Estabelecimento | null
  configuracoes: ConfiguracoesEstabelecimento | null
  perfil: PerfilUsuario | null
  isLoading: boolean

  setUser: (user: Usuario | null) => void
  setEstabelecimento: (est: Estabelecimento | null) => void
  setConfiguracoes: (cfg: ConfiguracoesEstabelecimento | null) => void
  setPerfil: (perfil: PerfilUsuario | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      estabelecimento: null,
      configuracoes: null,
      perfil: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setEstabelecimento: (est) => set({ estabelecimento: est }),
      setConfiguracoes: (cfg) => set({ configuracoes: cfg }),
      setPerfil: (perfil) => set({ perfil }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ user: null, estabelecimento: null, configuracoes: null, perfil: null }),
    }),
    {
      name: 'bnc-auth',
      partialize: (state) => ({
        user: state.user,
        estabelecimento: state.estabelecimento,
        perfil: state.perfil,
      }),
    }
  )
)
