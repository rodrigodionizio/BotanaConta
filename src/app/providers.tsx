'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useComandasStore } from '@/store/comandas'
import { useAuthInit } from '@/hooks/useAuthInit'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function AuthInitializer() {
  useAuthInit()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const setOnline = useComandasStore((s) => s.setOnline)

  useEffect(() => {
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [setOnline])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9375rem',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--danger)',  secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
