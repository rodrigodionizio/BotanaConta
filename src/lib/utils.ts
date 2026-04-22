// Utilitários gerais

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Merge de classes Tailwind com clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formata valor monetário em Real */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** Tempo relativo em pt-BR (ex: "há 3 minutos") */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

/** Duração em minutos desde a data */
export function minutesAgo(date: string | Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000)
}

/** Formata data e hora curta */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/** Formata apenas hora */
export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/** Valida identificação de comanda (RN-003) */
export function validarIdentificacao(valor: string): string | null {
  const trimmed = valor.trim()
  if (trimmed.length === 0) return 'Identificação é obrigatória'
  if (trimmed.length > 30) return 'Máximo de 30 caracteres'
  return null
}

/** Gera iniciais a partir de um nome */
export function getInitials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

/** Sleep para awaiting */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
