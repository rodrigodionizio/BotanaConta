'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  conectarImpressora,
  gerarDocumentoComanda,
  type ConfigImpressora,
  type ConexaoTipo,
} from '@/lib/impressora'

type Status = 'idle' | 'connecting' | 'connected' | 'printing' | 'error'

export default function ImpressorasPage() {
  const router = useRouter()
  const [tipo, setTipo]     = useState<ConexaoTipo>('bluetooth')
  const [ip, setIp]         = useState('')
  const [porta, setPorta]   = useState('9100')
  const [status, setStatus] = useState<Status>('idle')
  const [mensagem, setMensagem] = useState('')

  const testarImpressora = async () => {
    setStatus('connecting')
    setMensagem('')
    try {
      const config: ConfigImpressora = {
        tipo,
        ip:    tipo === 'wifi' ? ip   : undefined,
        porta: tipo === 'wifi' ? parseInt(porta) : undefined,
      }
      const printer = await conectarImpressora(config)
      setStatus('printing')

      const doc = gerarDocumentoComanda({
        nomeEstabelecimento: 'Bota na Conta',
        identificacao: 'TESTE',
        itens: [
          { nome: 'Espetinho de Frango', quantidade: 2, precoUnit: 6.0, subtotal: 12.0 },
          { nome: 'Cerveja Long Neck',   quantidade: 3, precoUnit: 10.0, subtotal: 30.0 },
        ],
        subtotal:    42.0,
        taxaServicoPct: 10,
        totalFinal:  46.2,
      })

      await printer.imprimir(doc)
      await printer.desconectar()
      setStatus('connected')
      setMensagem('Impressão de teste enviada com sucesso!')
    } catch (err) {
      setStatus('error')
      setMensagem(err instanceof Error ? err.message : 'Erro desconhecido ao conectar.')
    }
  }

  const statusConfig: Record<Status, { icon: string; color: string }> = {
    idle:       { icon: '🖨️', color: 'text-[var(--s-gray-400)]' },
    connecting: { icon: '🔄', color: 'text-[var(--warning)]' },
    connected:  { icon: '✅', color: 'text-[var(--success)]' },
    printing:   { icon: '🖨️', color: 'text-[var(--info)]' },
    error:      { icon: '❌', color: 'text-[var(--danger)]' },
  }

  const { icon, color } = statusConfig[status]

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-body)]">

      {/* ── Header ───────────────────────────────────── */}
      <header className="bg-[var(--s-black)] px-5 py-4 shrink-0 pt-safe">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[var(--p-orange)] text-sm font-bold mb-3"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-xl font-black text-[var(--p-orange)]">🖨️ Impressora</h1>
          <p className="text-xs text-white/50 mt-1">ESC/POS Térmica · Bluetooth ou WiFi</p>
        </div>
      </header>

      {/* ── Conteúdo ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

        {/* Status atual */}
        <div className="card flex items-center gap-4 px-5 py-4">
          <span className="text-3xl">{icon}</span>
          <div>
            <p className={`text-sm font-bold ${color}`}>
              {status === 'idle'       && 'Aguardando configuração'}
              {status === 'connecting' && 'Conectando...'}
              {status === 'connected'  && 'Teste enviado!'}
              {status === 'printing'   && 'Imprimindo...'}
              {status === 'error'      && 'Erro de conexão'}
            </p>
            {mensagem && (
              <p className="text-xs text-[var(--s-gray-400)] mt-0.5">{mensagem}</p>
            )}
          </div>
        </div>

        {/* Tipo de conexão */}
        <section>
          <h2 className="text-xs font-extrabold text-[var(--s-gray-400)] uppercase tracking-wide mb-2.5">
            Tipo de conexão
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {(['bluetooth', 'wifi'] as ConexaoTipo[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`card py-4 flex flex-col items-center gap-2 transition-all ${
                  tipo === t
                    ? 'ring-2 ring-[var(--p-orange)] ring-offset-1'
                    : 'opacity-60'
                }`}
              >
                <span className="text-3xl">{t === 'bluetooth' ? '📡' : '📶'}</span>
                <span className="text-sm font-bold text-[var(--s-black)]">
                  {t === 'bluetooth' ? 'Bluetooth' : 'WiFi / Rede'}
                </span>
                <span className="text-[10px] text-[var(--s-gray-400)] text-center">
                  {t === 'bluetooth'
                    ? 'BLE · Chrome/Edge'
                    : `IP local · porta ${porta}`}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Config WiFi */}
        {tipo === 'wifi' && (
          <section>
            <h2 className="text-xs font-extrabold text-[var(--s-gray-400)] uppercase tracking-wide mb-2.5">
              Endereço da impressora
            </h2>
            <div className="card flex flex-col gap-3 p-4">
              <div>
                <label className="text-xs font-bold text-[var(--s-gray-400)] block mb-1">
                  Endereço IP
                </label>
                <input
                  type="text"
                  placeholder="ex: 192.168.1.100"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="w-full rounded-xl border border-[var(--s-gray-200)] px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--p-orange)]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--s-gray-400)] block mb-1">
                  Porta
                </label>
                <input
                  type="number"
                  placeholder="9100"
                  value={porta}
                  onChange={(e) => setPorta(e.target.value)}
                  className="w-full rounded-xl border border-[var(--s-gray-200)] px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--p-orange)]"
                />
              </div>
            </div>
          </section>
        )}

        {/* Info Bluetooth */}
        {tipo === 'bluetooth' && (
          <div className="card flex items-start gap-3 px-4 py-3">
            <span className="text-lg mt-0.5">ℹ️</span>
            <p className="text-xs text-[var(--s-gray-400)] leading-relaxed">
              Requer Chrome ou Edge em HTTPS. O seletor nativo de dispositivos Bluetooth será exibido ao clicar em <strong>Testar impressora</strong>.
              Certifique-se de que a impressora esteja pareada nas configurações do sistema.
            </p>
          </div>
        )}

        {/* Botão de teste */}
        <button
          onClick={testarImpressora}
          disabled={status === 'connecting' || status === 'printing'}
          className="w-full rounded-2xl py-4 font-extrabold text-base bg-[var(--p-orange)] text-white disabled:opacity-50 active:scale-95 transition-transform"
        >
          {status === 'connecting' || status === 'printing'
            ? 'Aguarde...'
            : '🖨️ Testar impressora'}
        </button>

        {/* Modelos compatíveis */}
        <section>
          <h2 className="text-xs font-extrabold text-[var(--s-gray-400)] uppercase tracking-wide mb-2.5">
            Modelos testados
          </h2>
          <div className="card overflow-hidden">
            {[
              { modelo: 'Epson TM-T20',   tipo: 'Bluetooth + WiFi' },
              { modelo: 'Epson TM-T88',   tipo: 'Bluetooth + USB'  },
              { modelo: 'Bematech MP-4200', tipo: 'Bluetooth'       },
              { modelo: 'Elgin i9',        tipo: 'WiFi'             },
              { modelo: 'Generic ESC/POS', tipo: 'Qualquer conexão' },
            ].map((m, i, arr) => (
              <div
                key={m.modelo}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < arr.length - 1 ? 'border-b border-[var(--s-gray-200)]' : ''
                }`}
              >
                <span className="text-sm font-medium text-[var(--s-black)]">{m.modelo}</span>
                <span className="text-[10px] text-[var(--s-gray-400)]">{m.tipo}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
