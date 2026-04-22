import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="text-2xl font-bold text-gray-900">Página não encontrada</h1>
      <p className="text-gray-600 max-w-sm">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link
        href="/mesas"
        className="mt-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold"
      >
        Ir para o início
      </Link>
    </div>
  )
}
