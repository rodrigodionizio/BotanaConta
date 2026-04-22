'use client'

import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useComandasStore } from '@/store/comandas'

export function OfflineBadge() {
  const isOnline = useComandasStore((s) => s.isOnline)

  if (isOnline) return null

  return (
    <div className="badge-offline flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--s-gray-400)] text-white text-xs font-semibold">
      <WifiOff size={12} />
      Offline
    </div>
  )
}

export function SyncIndicator({ syncing }: { syncing: boolean }) {
  const isOnline = useComandasStore((s) => s.isOnline)

  if (!syncing || !isOnline) return null

  return (
    <div className="flex items-center gap-1 text-xs text-[var(--s-gray-400)]">
      <RefreshCw size={12} className="spinner" />
      Sincronizando...
    </div>
  )
}

export function ConnectionStatus() {
  const isOnline = useComandasStore((s) => s.isOnline)

  return (
    <div
      className={`flex items-center gap-1 text-xs font-medium ${
        isOnline ? 'text-[var(--success)]' : 'text-[var(--s-gray-400)]'
      }`}
    >
      {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
      {isOnline ? 'Online' : 'Offline'}
    </div>
  )
}
