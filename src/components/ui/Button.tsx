'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClass = {
      primary:   'btn-primary',
      secondary: 'btn-secondary',
      danger:    'btn-danger',
      ghost:     'btn-ghost',
    }[variant]

    const sizeClass = {
      sm: 'text-sm px-3 min-h-[36px]',
      md: '',
      lg: 'text-lg px-6 min-h-[56px]',
    }[size]

    return (
      <button
        ref={ref}
        className={cn(variantClass, sizeClass, fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 size={16} className="spinner" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
