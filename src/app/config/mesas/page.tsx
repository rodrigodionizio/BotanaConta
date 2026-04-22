'use client'

import { redirect } from 'next/navigation'

/** Redireciona /config/mesas → /admin/mesas */
export default function ConfigMesasPage() {
  redirect('/admin/mesas')
}
