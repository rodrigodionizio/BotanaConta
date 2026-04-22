'use client'

import { redirect } from 'next/navigation'

/** Redireciona /config/cardapio → /admin/cardapio */
export default function ConfigCardapioPage() {
  redirect('/admin/cardapio')
}
