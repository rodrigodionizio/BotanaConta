// ============================================================
// BOTA NA CONTA — Tipos TypeScript (espelho do schema Supabase)
// ============================================================

// ── Enums ────────────────────────────────────────────────
export type PerfilUsuario = 'ADMIN' | 'GARCOM' | 'COZINHA'

export type StatusComanda = 'ATIVA' | 'CONTA_PEDIDA' | 'FECHADA' | 'CANCELADA'

export type StatusItemComanda = 'ATIVO' | 'REMOVIDO'

export type StatusTicketCozinha = 'PENDENTE' | 'EM_PREPARO' | 'PRONTO' | 'CANCELADO'

export type TipoPreparo = 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR'

export type FormaPagamento =
  | 'PIX'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'DINHEIRO'
  | 'VOUCHER'
  | 'CORTESIA'

export type TipoEventoComanda =
  | 'COMANDA_ABERTA'
  | 'COMANDA_RENOMEADA'
  | 'ITEM_ADICIONADO'
  | 'ITEM_REMOVIDO'
  | 'QUANTIDADE_ALTERADA'
  | 'OBSERVACAO_EDITADA'
  | 'CONTA_PEDIDA'
  | 'DESCONTO_APLICADO'
  | 'PAGAMENTO_REGISTRADO'
  | 'COMANDA_FECHADA'
  | 'COMANDA_CANCELADA'
  | 'TICKET_INICIADO'
  | 'TICKET_PRONTO'
  | 'TICKET_CANCELADO'
  | 'PROBLEMA_REPORTADO'

// ── Entidades base ────────────────────────────────────────

export interface Usuario {
  id: string
  nome: string
  email: string
  avatar_url?: string | null
  criado_em: string
  atualizado_em: string
  // join
  perfil?: PerfilUsuario
}

export interface Estabelecimento {
  id: string
  nome: string
  cnpj?: string | null
  telefone?: string | null
  endereco?: string | null
  logo_url?: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface ConfiguracoesEstabelecimento {
  id: string
  estabelecimento_id: string
  taxa_servico_pct: number
  taxa_servico_ativa: boolean
  moeda: string
  tempo_ticket_pronto_visivel_min: number
  permite_garcom_fechar_conta: boolean
  permite_garcom_aplicar_desconto: boolean
  alerta_sonoro_cozinha: boolean
  atualizado_em: string
}

export interface MesaPreset {
  id: string
  estabelecimento_id: string
  nome: string
  ativa: boolean
  ordem_exibicao: number
  criado_em: string
  atualizado_em: string
}

export interface CategoriaProduto {
  id: string
  estabelecimento_id: string
  nome: string
  vai_para_cozinha_padrao: boolean
  tipo_preparo_padrao?: TipoPreparo | null
  cor_hex?: string | null
  icone_url?: string | null
  ordem_exibicao: number
  ativa: boolean
  criado_em: string
  atualizado_em: string
}

export interface Produto {
  id: string
  estabelecimento_id: string
  categoria_id?: string | null
  nome: string
  descricao?: string | null
  preco: number
  vai_para_cozinha: boolean
  tipo_preparo?: TipoPreparo | null
  disponivel: boolean
  ordem_exibicao: number
  criado_em: string
  atualizado_em: string
  // joins
  categoria?: CategoriaProduto
  foto_principal?: FotoProduto | null
}

export interface FotoProduto {
  id: string
  produto_id: string
  url_original: string
  url_thumbnail?: string | null
  url_preview?: string | null
  principal: boolean
  criado_em: string
}

export interface Comanda {
  id: string
  estabelecimento_id: string
  identificacao: string
  status: StatusComanda
  aberta_por: string
  aberta_em: string
  conta_pedida_em?: string | null
  fechada_em?: string | null
  cancelada_em?: string | null
  motivo_cancelamento?: string | null
  total_bruto: number
  desconto_valor: number
  desconto_motivo?: string | null
  taxa_servico_pct: number
  taxa_servico_valor: number
  total_final: number
  // joins
  itens?: ComandaItem[]
  pagamentos?: Pagamento[]
  eventos?: ComandaEvento[]
  garcom?: Usuario
}

export interface ComandaItem {
  id: string
  comanda_id: string
  produto_id: string
  produto_nome_snapshot: string
  preco_unitario_snapshot: number
  vai_para_cozinha_snapshot: boolean
  tipo_preparo_snapshot?: TipoPreparo | null
  quantidade: number
  subtotal: number
  observacao?: string | null
  status: StatusItemComanda
  adicionado_por: string
  adicionado_em: string
  atualizado_em: string
  // joins
  produto?: Produto
  ticket?: TicketCozinha
}

export interface TicketCozinha {
  id: string
  estabelecimento_id: string
  comanda_id: string
  comanda_item_id: string
  identificacao_mesa: string
  produto_nome: string
  quantidade: number
  observacao?: string | null
  tipo_preparo: TipoPreparo
  garcom_nome: string
  status: StatusTicketCozinha
  criado_em: string
  iniciado_em?: string | null
  concluido_em?: string | null
  cancelado_em?: string | null
}

export interface Pagamento {
  id: string
  comanda_id: string
  forma: FormaPagamento
  valor: number
  troco?: number | null
  observacao?: string | null
  registrado_por: string
  registrado_em: string
}

export interface ComandaEvento {
  id: number
  comanda_id: string
  tipo: TipoEventoComanda
  descricao: string
  usuario_id?: string | null
  usuario_nome?: string | null
  metadados?: Record<string, unknown> | null
  ocorrido_em: string
}

// ── DTOs (para criação/edição) ────────────────────────────

export interface CriarComandaInput {
  identificacao: string
  estabelecimento_id: string
}

export interface AdicionarItemInput {
  comanda_id: string
  produto_id: string
  quantidade: number
  observacao?: string
}

export interface AtualizarQuantidadeInput {
  item_id: string
  quantidade: number
}

export interface FecharContaInput {
  comanda_id: string
  pagamentos: {
    forma: FormaPagamento
    valor: number
    troco?: number
    observacao?: string
  }[]
  desconto_valor?: number
  desconto_motivo?: string
}

export interface CriarProdutoInput {
  nome: string
  categoria_id?: string
  descricao?: string
  preco: number
  vai_para_cozinha: boolean
  tipo_preparo?: TipoPreparo
  disponivel: boolean
  ordem_exibicao?: number
}

// ── UI helpers ─────────────────────────────────────────────

export interface MesaCard {
  comanda: Comanda | null
  preset: MesaPreset | null
  identificacao: string
  status: StatusComanda | 'LIVRE'
}

export type PrepTipoConfig = {
  label: string
  className: string
  emoji: string
}

export const PREP_TIPO_CONFIG: Record<TipoPreparo, PrepTipoConfig> = {
  FRITAR:    { label: 'Fritar',    className: 'prep-fritar',    emoji: '🟠' },
  ASSAR:     { label: 'Assar',     className: 'prep-assar',     emoji: '🔴' },
  COZINHAR:  { label: 'Cozinhar',  className: 'prep-cozinhar',  emoji: '🔵' },
  ESQUENTAR: { label: 'Esquentar', className: 'prep-esquentar', emoji: '🟡' },
  MONTAR:    { label: 'Montar',    className: 'prep-montar',    emoji: '🟢' },
}

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  PIX:            'Pix',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO:  'Cartão de Débito',
  DINHEIRO:       'Dinheiro',
  VOUCHER:        'Voucher',
  CORTESIA:       'Cortesia',
}

export const STATUS_COMANDA_LABEL: Record<StatusComanda, string> = {
  ATIVA:        'Ativa',
  CONTA_PEDIDA: 'Conta Pedida',
  FECHADA:      'Fechada',
  CANCELADA:    'Cancelada',
}
