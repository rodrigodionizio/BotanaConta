'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Drawer (slide-up) ─────────────────────────────────────
interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

export function Drawer({ open, onClose, children, title, className }: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        ref={overlayRef}
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn('drawer', className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="drawer-handle" />
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--s-gray-200)]">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="btn-ghost p-2 rounded-full"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  )
}

// ── Modal (center) ────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

export function Modal({ open, onClose, children, title, className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn('modal', className)} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--s-gray-200)]">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="btn-ghost p-2 rounded-full"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmProps) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-sm" role="alertdialog" aria-modal="true">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-2">{title}</h3>
          <p className="text-[var(--s-gray-600)] mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </button>
            <button
              className={variant === 'danger' ? 'btn-danger flex-1' : 'btn-primary flex-1'}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Aguarde...
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
