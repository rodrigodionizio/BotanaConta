// ============================================================
// Supabase Database types (gerado do schema)
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          avatar_url: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          avatar_url?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          nome?: string
          email?: string
          avatar_url?: string | null
          atualizado_em?: string
        }
        Relationships: []
      }
      estabelecimentos: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          telefone: string | null
          endereco: string | null
          logo_url: string | null
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          telefone?: string | null
          endereco?: string | null
          logo_url?: string | null
          ativo?: boolean
        }
        Update: {
          nome?: string
          cnpj?: string | null
          telefone?: string | null
          endereco?: string | null
          logo_url?: string | null
          ativo?: boolean
        }
        Relationships: []
      }
      usuario_estabelecimento: {
        Row: {
          id: string
          usuario_id: string
          estabelecimento_id: string
          perfil: 'ADMIN' | 'GARCOM' | 'COZINHA'
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          usuario_id: string
          estabelecimento_id: string
          perfil: 'ADMIN' | 'GARCOM' | 'COZINHA'
          ativo?: boolean
        }
        Update: {
          perfil?: 'ADMIN' | 'GARCOM' | 'COZINHA'
          ativo?: boolean
        }
        Relationships: [
          { foreignKeyName: 'usuario_estabelecimento_usuario_id_fkey'; columns: ['usuario_id']; isOneToOne: false; referencedRelation: 'usuarios'; referencedColumns: ['id'] },
          { foreignKeyName: 'usuario_estabelecimento_estabelecimento_id_fkey'; columns: ['estabelecimento_id']; isOneToOne: false; referencedRelation: 'estabelecimentos'; referencedColumns: ['id'] }
        ]
      }
      configuracoes_estabelecimento: {
        Row: {
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
        Insert: {
          id?: string
          estabelecimento_id: string
          taxa_servico_pct?: number
          taxa_servico_ativa?: boolean
          moeda?: string
          tempo_ticket_pronto_visivel_min?: number
          permite_garcom_fechar_conta?: boolean
          permite_garcom_aplicar_desconto?: boolean
          alerta_sonoro_cozinha?: boolean
        }
        Update: {
          taxa_servico_pct?: number
          taxa_servico_ativa?: boolean
          tempo_ticket_pronto_visivel_min?: number
          permite_garcom_fechar_conta?: boolean
          permite_garcom_aplicar_desconto?: boolean
          alerta_sonoro_cozinha?: boolean
        }
        Relationships: []
      }
      mesas_preset: {
        Row: {
          id: string
          estabelecimento_id: string
          nome: string
          ativa: boolean
          ordem_exibicao: number
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          estabelecimento_id: string
          nome: string
          ativa?: boolean
          ordem_exibicao?: number
        }
        Update: {
          nome?: string
          ativa?: boolean
          ordem_exibicao?: number
          atualizado_em?: string
        }
        Relationships: []
      }
      categorias_produto: {
        Row: {
          id: string
          estabelecimento_id: string
          nome: string
          vai_para_cozinha_padrao: boolean
          tipo_preparo_padrao: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          cor_hex: string | null
          icone_url: string | null
          ordem_exibicao: number
          ativa: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          estabelecimento_id: string
          nome: string
          vai_para_cozinha_padrao?: boolean
          tipo_preparo_padrao?: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          cor_hex?: string | null
          icone_url?: string | null
          ordem_exibicao?: number
          ativa?: boolean
        }
        Update: {
          nome?: string
          vai_para_cozinha_padrao?: boolean
          tipo_preparo_padrao?: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          cor_hex?: string | null
          ordem_exibicao?: number
          ativa?: boolean
          atualizado_em?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          id: string
          estabelecimento_id: string
          categoria_id: string | null
          nome: string
          descricao: string | null
          preco: number
          vai_para_cozinha: boolean
          tipo_preparo: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          disponivel: boolean
          ordem_exibicao: number
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          estabelecimento_id: string
          categoria_id?: string | null
          nome: string
          descricao?: string | null
          preco: number
          vai_para_cozinha?: boolean
          tipo_preparo?: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          disponivel?: boolean
          ordem_exibicao?: number
        }
        Update: {
          categoria_id?: string | null
          nome?: string
          descricao?: string | null
          preco?: number
          vai_para_cozinha?: boolean
          tipo_preparo?: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          disponivel?: boolean
          ordem_exibicao?: number
          atualizado_em?: string
        }
        Relationships: [
          { foreignKeyName: 'produtos_categoria_id_fkey'; columns: ['categoria_id']; isOneToOne: false; referencedRelation: 'categorias_produto'; referencedColumns: ['id'] }
        ]
      }
      fotos_produto: {
        Row: {
          id: string
          produto_id: string
          url_original: string
          url_thumbnail: string | null
          url_preview: string | null
          principal: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          produto_id: string
          url_original: string
          url_thumbnail?: string | null
          url_preview?: string | null
          principal?: boolean
        }
        Update: {
          url_original?: string
          url_thumbnail?: string | null
          url_preview?: string | null
          principal?: boolean
        }
        Relationships: [
          { foreignKeyName: 'fotos_produto_produto_id_fkey'; columns: ['produto_id']; isOneToOne: false; referencedRelation: 'produtos'; referencedColumns: ['id'] }
        ]
      }
      comandas: {
        Row: {
          id: string
          estabelecimento_id: string
          identificacao: string
          status: 'ATIVA' | 'CONTA_PEDIDA' | 'FECHADA' | 'CANCELADA'
          aberta_por: string
          aberta_em: string
          conta_pedida_em: string | null
          fechada_em: string | null
          cancelada_em: string | null
          motivo_cancelamento: string | null
          total_bruto: number
          desconto_valor: number
          desconto_motivo: string | null
          desconto_aplicado_por: string | null
          taxa_servico_pct: number
          taxa_servico_valor: number
          total_final: number
        }
        Insert: {
          id?: string
          estabelecimento_id: string
          identificacao: string
          status?: 'ATIVA' | 'CONTA_PEDIDA' | 'FECHADA' | 'CANCELADA'
          aberta_por: string
          taxa_servico_pct?: number
        }
        Update: {
          identificacao?: string
          status?: 'ATIVA' | 'CONTA_PEDIDA' | 'FECHADA' | 'CANCELADA'
          conta_pedida_em?: string | null
          fechada_em?: string | null
          cancelada_em?: string | null
          motivo_cancelamento?: string | null
          total_bruto?: number
          desconto_valor?: number
          desconto_motivo?: string | null
          desconto_aplicado_por?: string | null
          taxa_servico_pct?: number
        }
        Relationships: [
          { foreignKeyName: 'comandas_aberta_por_fkey'; columns: ['aberta_por']; isOneToOne: false; referencedRelation: 'usuarios'; referencedColumns: ['id'] }
        ]
      }
      comanda_itens: {
        Row: {
          id: string
          comanda_id: string
          produto_id: string
          produto_nome_snapshot: string
          preco_unitario_snapshot: number
          vai_para_cozinha_snapshot: boolean
          tipo_preparo_snapshot: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          quantidade: number
          subtotal: number
          observacao: string | null
          status: 'ATIVO' | 'REMOVIDO'
          adicionado_por: string
          adicionado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          comanda_id: string
          produto_id: string
          produto_nome_snapshot?: string
          preco_unitario_snapshot?: number
          vai_para_cozinha_snapshot?: boolean
          tipo_preparo_snapshot?: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR' | null
          quantidade: number
          observacao?: string | null
          adicionado_por: string
        }
        Update: {
          quantidade?: number
          observacao?: string | null
          status?: 'ATIVO' | 'REMOVIDO'
          atualizado_em?: string
        }
        Relationships: [
          { foreignKeyName: 'comanda_itens_comanda_id_fkey'; columns: ['comanda_id']; isOneToOne: false; referencedRelation: 'comandas'; referencedColumns: ['id'] },
          { foreignKeyName: 'comanda_itens_produto_id_fkey'; columns: ['produto_id']; isOneToOne: false; referencedRelation: 'produtos'; referencedColumns: ['id'] },
          { foreignKeyName: 'comanda_itens_adicionado_por_fkey'; columns: ['adicionado_por']; isOneToOne: false; referencedRelation: 'usuarios'; referencedColumns: ['id'] }
        ]
      }
      tickets_cozinha: {
        Row: {
          id: string
          estabelecimento_id: string
          comanda_id: string
          comanda_item_id: string
          identificacao_mesa: string
          produto_nome: string
          quantidade: number
          observacao: string | null
          tipo_preparo: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR'
          garcom_nome: string
          status: 'PENDENTE' | 'EM_PREPARO' | 'PRONTO' | 'CANCELADO'
          criado_em: string
          iniciado_em: string | null
          concluido_em: string | null
          cancelado_em: string | null
        }
        Insert: {
          id?: string
          estabelecimento_id: string
          comanda_id: string
          comanda_item_id: string
          identificacao_mesa: string
          produto_nome: string
          quantidade: number
          observacao?: string | null
          tipo_preparo: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR'
          garcom_nome: string
        }
        Update: {
          status?: 'PENDENTE' | 'EM_PREPARO' | 'PRONTO' | 'CANCELADO'
          iniciado_em?: string | null
          concluido_em?: string | null
          cancelado_em?: string | null
        }
        Relationships: [
          { foreignKeyName: 'tickets_cozinha_comanda_id_fkey'; columns: ['comanda_id']; isOneToOne: false; referencedRelation: 'comandas'; referencedColumns: ['id'] },
          { foreignKeyName: 'tickets_cozinha_comanda_item_id_fkey'; columns: ['comanda_item_id']; isOneToOne: false; referencedRelation: 'comanda_itens'; referencedColumns: ['id'] }
        ]
      }
      pagamentos: {
        Row: {
          id: string
          comanda_id: string
          forma: 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'VOUCHER' | 'CORTESIA'
          valor: number
          troco: number | null
          observacao: string | null
          registrado_por: string
          registrado_em: string
        }
        Insert: {
          id?: string
          comanda_id: string
          forma: 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'VOUCHER' | 'CORTESIA'
          valor: number
          troco?: number | null
          observacao?: string | null
          registrado_por: string
        }
        Update: {
          forma?: 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'VOUCHER' | 'CORTESIA'
          valor?: number
          troco?: number | null
          observacao?: string | null
        }
        Relationships: [
          { foreignKeyName: 'pagamentos_comanda_id_fkey'; columns: ['comanda_id']; isOneToOne: false; referencedRelation: 'comandas'; referencedColumns: ['id'] }
        ]
      }
      comanda_eventos: {
        Row: {
          id: number
          comanda_id: string
          tipo: string
          descricao: string
          usuario_id: string | null
          usuario_nome: string | null
          metadados: Json | null
          ocorrido_em: string
        }
        Insert: {
          comanda_id: string
          tipo: string
          descricao: string
          usuario_id?: string | null
          usuario_nome?: string | null
          metadados?: Json | null
        }
        Update: Record<string, never>
        Relationships: [
          { foreignKeyName: 'comanda_eventos_comanda_id_fkey'; columns: ['comanda_id']; isOneToOne: false; referencedRelation: 'comandas'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: {
      v_fila_cozinha: {
        Row: {
          id: string
          estabelecimento_id: string
          comanda_id: string
          comanda_item_id: string
          identificacao_mesa: string
          produto_nome: string
          quantidade: number
          observacao: string | null
          tipo_preparo: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR'
          garcom_nome: string
          status: 'PENDENTE' | 'EM_PREPARO' | 'PRONTO' | 'CANCELADO'
          criado_em: string
          iniciado_em: string | null
          concluido_em: string | null
          cancelado_em: string | null
        }
        Relationships: []
      }
      convites: {
        Row: {
          id: string
          estabelecimento_id: string
          email: string
          perfil: 'ADMIN' | 'GARCOM' | 'COZINHA'
          token: string
          convidado_por: string
          enviado_em: string
          expira_em: string
          status: 'PENDENTE' | 'ACEITO' | 'CANCELADO' | 'EXPIRADO'
          aceito_em: string | null
          aceito_por_usuario: string | null
        }
        Insert: {
          id?: string
          estabelecimento_id: string
          email: string
          perfil: 'ADMIN' | 'GARCOM' | 'COZINHA'
          token: string
          convidado_por: string
          enviado_em?: string
          expira_em?: string
          status?: 'PENDENTE' | 'ACEITO' | 'CANCELADO' | 'EXPIRADO'
          aceito_em?: string | null
          aceito_por_usuario?: string | null
        }
        Update: {
          status?: 'PENDENTE' | 'ACEITO' | 'CANCELADO' | 'EXPIRADO'
          aceito_em?: string | null
          aceito_por_usuario?: string | null
        }
        Relationships: [
          { foreignKeyName: 'convites_estabelecimento_id_fkey'; columns: ['estabelecimento_id']; isOneToOne: false; referencedRelation: 'estabelecimentos'; referencedColumns: ['id'] },
          { foreignKeyName: 'convites_convidado_por_fkey'; columns: ['convidado_por']; isOneToOne: false; referencedRelation: 'usuarios'; referencedColumns: ['id'] }
        ]
      }
    }
    Functions: {
      setup_estabelecimento: {
        Args: { nome_estab: string }
        Returns: Json
      }
      validar_convite: {
        Args: { p_token: string }
        Returns: Json
      }
      aceitar_convite: {
        Args: { p_token: string }
        Returns: Json
      }
    }
    Enums: {
      perfil_usuario: 'ADMIN' | 'GARCOM' | 'COZINHA'
      status_comanda: 'ATIVA' | 'CONTA_PEDIDA' | 'FECHADA' | 'CANCELADA'
      status_item_comanda: 'ATIVO' | 'REMOVIDO'
      status_ticket_cozinha: 'PENDENTE' | 'EM_PREPARO' | 'PRONTO' | 'CANCELADO'
      tipo_preparo: 'FRITAR' | 'ASSAR' | 'COZINHAR' | 'ESQUENTAR' | 'MONTAR'
      forma_pagamento: 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'VOUCHER' | 'CORTESIA'
    }
  }
}
