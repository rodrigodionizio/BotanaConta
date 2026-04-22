'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: '🏠', label: 'Mesas',     href: '/mesas',    match: '/mesas' },
  { icon: '📋', label: 'Histórico', href: '/historico', match: '/historico' },
  { icon: '⚙️', label: 'Config',    href: '/config',   match: '/config' },
]

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (match: string) =>
    pathname === match || pathname.startsWith(match + '/')

  return (
    <nav
      className="bg-[var(--s-black)] flex px-2 pb-safe gap-1 shrink-0"
      role="navigation"
      aria-label="Navegação principal"
    >
      {NAV_ITEMS.map((item) => (
        <button
          key={item.label}
          onClick={() => router.push(item.href)}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all',
            isActive(item.match)
              ? 'text-[var(--p-orange)] bg-[rgba(255,91,34,0.12)]'
              : 'text-[rgba(255,255,255,0.35)]'
          )}
          aria-label={item.label}
          aria-current={isActive(item.match) ? 'page' : undefined}
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-[10px] font-bold leading-none">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
