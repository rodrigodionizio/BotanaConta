'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center font-sans">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">Algo deu errado</h1>
        <p className="text-gray-600 max-w-sm">
          Ocorreu um erro inesperado. Se o problema persistir, entre em contato com o suporte.
        </p>
        <button
          onClick={reset}
          className="mt-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
