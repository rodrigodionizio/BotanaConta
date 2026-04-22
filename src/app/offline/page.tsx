'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">📶</div>
      <h1 className="text-2xl font-bold text-gray-900">Sem conexão</h1>
      <p className="text-gray-600 max-w-sm">
        Verifique sua internet e tente novamente. O Bota na Conta precisa de conexão para
        funcionar.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold active:scale-95 transition-transform"
      >
        Tentar novamente
      </button>
    </div>
  )
}
