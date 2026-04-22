/**
 * impressora.ts — Abstração ESC/POS para impressoras térmicas
 *
 * Suporta dois modos de conexão:
 *   - Web Bluetooth (Chrome/Edge, HTTPS, serviço Bluetooth Serial Port)
 *   - Network/WiFi  (fetch POST para endereço IP local, porta 9100)
 *
 * Usage:
 *   const printer = await conectarImpressora({ tipo: 'bluetooth' })
 *   const doc = novaComanda(comanda, itens, estabelecimento, taxaServico)
 *   await printer.imprimir(doc)
 *   await printer.desconectar()
 */

// ── ESC/POS constants ─────────────────────────────────────────────────────────
const ESC = '\x1b'
const GS  = '\x1d'

export const CMD = {
  INIT:          `${ESC}@`,
  BOLD_ON:       `${ESC}E\x01`,
  BOLD_OFF:      `${ESC}E\x00`,
  ALIGN_LEFT:    `${ESC}a\x00`,
  ALIGN_CENTER:  `${ESC}a\x01`,
  ALIGN_RIGHT:   `${ESC}a\x02`,
  FEED_1:        `${ESC}d\x01`,
  FEED_3:        `${ESC}d\x03`,
  CUT:           `${GS}V\x00`,
  SIZE_NORMAL:   `${ESC}!\x00`,
  SIZE_DOUBLE:   `${ESC}!\x10`,   // double height
  LINE_DASHES:   '-'.repeat(48) + '\n',
  LINE_EQUALS:   '='.repeat(48) + '\n',
} as const

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type ConexaoTipo = 'bluetooth' | 'wifi'

export interface ConfigImpressora {
  tipo: ConexaoTipo
  /** WiFi: ex. "192.168.1.100" */
  ip?: string
  /** WiFi: padrão 9100 */
  porta?: number
  /** Bluetooth: nome parcial do dispositivo, ex. "Printer" */
  nomeBluetooth?: string
  /** Colunas por linha (padrão 48 para 80mm) */
  colunas?: number
}

export interface ImpressoraHandle {
  imprimir:     (doc: string) => Promise<void>
  desconectar:  () => Promise<void>
  tipo:         ConexaoTipo
}

export interface ItemImpressao {
  nome:       string
  quantidade: number
  precoUnit:  number
  subtotal:   number
}

// ── Helpers de texto ──────────────────────────────────────────────────────────

/** Formata valor monetário estilo ESC/POS (sem Intl.NumberFormat para compatibilidade) */
export function brl(value: number): string {
  return 'R$ ' + value.toFixed(2).replace('.', ',')
}

/** Trunca + pad uma string para N colunas */
function padEnd(str: string, n: number): string {
  return str.slice(0, n).padEnd(n)
}

/** Alinha: left (fill) + right value, total = cols */
function colLine(left: string, right: string, cols: number = 48): string {
  const rightClean = right.slice(-cols)
  const leftLen = cols - rightClean.length
  return padEnd(left, leftLen) + rightClean + '\n'
}

// ── Documento: conta da comanda ───────────────────────────────────────────────

export interface DadosImpressaoComanda {
  nomeEstabelecimento: string
  identificacao:       string
  itens:               ItemImpressao[]
  subtotal:            number
  taxaServicoPct?:     number
  desconto?:           number
  totalFinal:          number
  abertoEm?:           string
  fechadoEm?:          string
  colunas?:            number
}

/**
 * Gera a string ESC/POS da conta de uma comanda.
 */
export function gerarDocumentoComanda(dados: DadosImpressaoComanda): string {
  const cols = dados.colunas ?? 48
  const {
    nomeEstabelecimento, identificacao, itens,
    subtotal, taxaServicoPct, desconto, totalFinal,
    abertoEm, fechadoEm,
  } = dados

  const taxaValor = taxaServicoPct ? subtotal * (taxaServicoPct / 100) : 0

  let doc = ''

  // Init + cabeçalho
  doc += CMD.INIT
  doc += CMD.ALIGN_CENTER
  doc += CMD.BOLD_ON
  doc += CMD.SIZE_DOUBLE
  doc += '🍢 Bota na Conta\n'
  doc += CMD.SIZE_NORMAL
  doc += nomeEstabelecimento.slice(0, cols) + '\n'
  doc += CMD.BOLD_OFF
  doc += CMD.LINE_DASHES
  doc += CMD.ALIGN_LEFT

  // Identificação
  doc += CMD.BOLD_ON
  doc += `Comanda: ${identificacao}\n`
  doc += CMD.BOLD_OFF
  if (abertoEm)  doc += `Aberta:  ${new Date(abertoEm).toLocaleString('pt-BR')}\n`
  if (fechadoEm) doc += `Fechada: ${new Date(fechadoEm).toLocaleString('pt-BR')}\n`
  doc += CMD.LINE_DASHES

  // Itens
  doc += CMD.BOLD_ON
  doc += colLine('ITEM', 'TOTAL', cols)
  doc += CMD.BOLD_OFF
  doc += CMD.LINE_DASHES

  for (const item of itens) {
    // linha 1: nome
    doc += item.nome.slice(0, cols) + '\n'
    // linha 2: qty × preço = subtotal
    const detalhe = `  ${item.quantidade}x ${brl(item.precoUnit)}`
    doc += colLine(detalhe, brl(item.subtotal), cols)
  }

  doc += CMD.LINE_DASHES

  // Totais
  doc += colLine('Subtotal', brl(subtotal), cols)
  if (taxaValor > 0 && taxaServicoPct) {
    doc += colLine(`Taxa serviço (${taxaServicoPct}%)`, brl(taxaValor), cols)
  }
  if (desconto && desconto > 0) {
    doc += colLine('Desconto', `-${brl(desconto)}`, cols)
  }
  doc += CMD.LINE_EQUALS
  doc += CMD.BOLD_ON
  doc += CMD.SIZE_DOUBLE
  doc += colLine('TOTAL', brl(totalFinal), cols)
  doc += CMD.SIZE_NORMAL
  doc += CMD.BOLD_OFF

  // Rodapé
  doc += CMD.FEED_3
  doc += CMD.ALIGN_CENTER
  doc += 'Obrigado pela preferência!\n'
  doc += 'Bota na Conta · botanaconta.app\n'
  doc += CMD.FEED_3
  doc += CMD.CUT

  return doc
}

// ── Encoder text → Uint8Array (ISO-8859-1 / Latin-1) ─────────────────────────

function encode(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff
  }
  return bytes
}

// ── Conexão Bluetooth ─────────────────────────────────────────────────────────

/** UUID do serviço Serial Port para impressoras BT clássicas via BLE */
const SPP_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb'
const SPP_CHAR    = '00002af1-0000-1000-8000-00805f9b34fb'

async function conectarBluetooth(config: ConfigImpressora): Promise<ImpressoraHandle> {
  if (!(navigator as unknown as Record<string, unknown>)['bluetooth']) {
    throw new Error('Web Bluetooth não disponível neste navegador. Use Chrome/Edge com HTTPS.')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bt = (navigator as any).bluetooth
  const device = await bt.requestDevice({
    filters: config.nomeBluetooth
      ? [{ namePrefix: config.nomeBluetooth }]
      : [{ services: [SPP_SERVICE] }],
    optionalServices: [SPP_SERVICE],
  })

  const server      = await device.gatt!.connect()
  const service     = await server.getPrimaryService(SPP_SERVICE)
  const characteristic = await service.getCharacteristic(SPP_CHAR)

  const imprimir = async (doc: string) => {
    const CHUNK = 512
    const bytes = encode(doc)
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      await characteristic.writeValueWithoutResponse(bytes.slice(offset, offset + CHUNK))
    }
  }

  const desconectar = async () => {
    if (device.gatt?.connected) device.gatt.disconnect()
  }

  return { imprimir, desconectar, tipo: 'bluetooth' }
}

// ── Conexão WiFi / Network ────────────────────────────────────────────────────

async function conectarWifi(config: ConfigImpressora): Promise<ImpressoraHandle> {
  const ip    = config.ip    ?? '192.168.1.100'
  const porta = config.porta ?? 9100
  const base  = `http://${ip}:${porta}`

  const imprimir = async (doc: string) => {
    const resp = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: encode(doc).buffer as ArrayBuffer,
    })
    if (!resp.ok) {
      throw new Error(`Impressora retornou HTTP ${resp.status}`)
    }
  }

  const desconectar = async () => { /* stateless */ }

  return { imprimir, desconectar, tipo: 'wifi' }
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Conecta à impressora conforme configuração.
 *
 * @example
 * const printer = await conectarImpressora({ tipo: 'bluetooth' })
 * await printer.imprimir(gerarDocumentoComanda(dados))
 * await printer.desconectar()
 */
export async function conectarImpressora(config: ConfigImpressora): Promise<ImpressoraHandle> {
  if (config.tipo === 'bluetooth') return conectarBluetooth(config)
  return conectarWifi(config)
}
