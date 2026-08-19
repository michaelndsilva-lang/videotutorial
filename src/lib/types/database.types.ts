// Gerado a partir do projeto Supabase real. Para atualizar após uma nova migration,
// peça para regenerar via mcp__claude_ai_Supabase__generate_typescript_types — os
// aliases de conveniência (AgenteModo, MembroStatus, UserRole, WhatsappStatus, ...) no
// final do arquivo são mantidos à mão e precisam ser reaplicados após regenerar.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agente_mensagens: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          is_followup: boolean
          membro_id: string
          processado: boolean
          remetente: Database["public"]["Enums"]["mensagem_remetente"]
          telefone_lead: string
          whatsapp_message_id: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          is_followup?: boolean
          membro_id: string
          processado?: boolean
          remetente: Database["public"]["Enums"]["mensagem_remetente"]
          telefone_lead: string
          whatsapp_message_id?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          is_followup?: boolean
          membro_id?: string
          processado?: boolean
          remetente?: Database["public"]["Enums"]["mensagem_remetente"]
          telefone_lead?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agente_mensagens_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      agentes_config: {
        Row: {
          id: string
          modo: Database["public"]["Enums"]["agente_modo"]
          prompt_followup: string
          prompt_sistema: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          modo: Database["public"]["Enums"]["agente_modo"]
          prompt_followup?: string
          prompt_sistema?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          modo?: Database["public"]["Enums"]["agente_modo"]
          prompt_followup?: string
          prompt_sistema?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agentes_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_gerais: {
        Row: {
          creditos_mensais_padrao: number
          custo_por_geracao: number
          id: string
          link_energia_padrao: string | null
          link_recrutamento_padrao: string | null
          modelo_ia_conteudo: string
          modo_credito: string
          nome_empresa: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          creditos_mensais_padrao?: number
          custo_por_geracao?: number
          id?: string
          link_energia_padrao?: string | null
          link_recrutamento_padrao?: string | null
          modelo_ia_conteudo?: string
          modo_credito?: string
          nome_empresa?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          creditos_mensais_padrao?: number
          custo_por_geracao?: number
          id?: string
          link_energia_padrao?: string | null
          link_recrutamento_padrao?: string | null
          modelo_ia_conteudo?: string
          modo_credito?: string
          nome_empresa?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_gerais_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudo_geracoes: {
        Row: {
          created_at: string
          favorito: boolean
          formato: Database["public"]["Enums"]["formato_conteudo"]
          id: string
          objetivo: Database["public"]["Enums"]["objetivo_conteudo"]
          prompt_final: string
          resultado: Json | null
          seq: number
          tema_livre: string | null
          tokens_consumidos: number | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          favorito?: boolean
          formato: Database["public"]["Enums"]["formato_conteudo"]
          id?: string
          objetivo: Database["public"]["Enums"]["objetivo_conteudo"]
          prompt_final: string
          resultado?: Json | null
          seq?: number
          tema_livre?: string | null
          tokens_consumidos?: number | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          favorito?: boolean
          formato?: Database["public"]["Enums"]["formato_conteudo"]
          id?: string
          objetivo?: Database["public"]["Enums"]["objetivo_conteudo"]
          prompt_final?: string
          resultado?: Json | null
          seq?: number
          tema_livre?: string | null
          tokens_consumidos?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudo_geracoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conteudo_prompt_templates: {
        Row: {
          ativo: boolean
          created_at: string
          formato: Database["public"]["Enums"]["formato_conteudo"]
          id: string
          objetivo: Database["public"]["Enums"]["objetivo_conteudo"]
          system_prompt: string
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          formato: Database["public"]["Enums"]["formato_conteudo"]
          id?: string
          objetivo: Database["public"]["Enums"]["objetivo_conteudo"]
          system_prompt: string
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          formato?: Database["public"]["Enums"]["formato_conteudo"]
          id?: string
          objetivo?: Database["public"]["Enums"]["objetivo_conteudo"]
          system_prompt?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      creditos_extrato: {
        Row: {
          created_at: string
          id: string
          quantidade: number
          referencia_id: string | null
          saldo_apos: number
          seq: number
          tipo: Database["public"]["Enums"]["tipo_credito"]
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantidade: number
          referencia_id?: string | null
          saldo_apos: number
          seq?: number
          tipo: Database["public"]["Enums"]["tipo_credito"]
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantidade?: number
          referencia_id?: string | null
          saldo_apos?: number
          seq?: number
          tipo?: Database["public"]["Enums"]["tipo_credito"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creditos_extrato_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "conteudo_geracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditos_extrato_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_leads: {
        Row: {
          etapa: string
          membro_id: string
          telefone_lead: string
          updated_at: string
        }
        Insert: {
          etapa?: string
          membro_id: string
          telefone_lead: string
          updated_at?: string
        }
        Update: {
          etapa?: string
          membro_id?: string
          telefone_lead?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "energia_leads_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      kanban_boards: {
        Row: {
          created_at: string
          id: string
          membro_id: string
          modo: Database["public"]["Enums"]["agente_modo"]
        }
        Insert: {
          created_at?: string
          id?: string
          membro_id: string
          modo?: Database["public"]["Enums"]["agente_modo"]
        }
        Update: {
          created_at?: string
          id?: string
          membro_id?: string
          modo?: Database["public"]["Enums"]["agente_modo"]
        }
        Relationships: [
          {
            foreignKeyName: "kanban_boards_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      kanban_cards: {
        Row: {
          board_id: string
          coluna_id: string
          created_at: string
          id: string
          nome_lead: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["card_origem"]
          posicao: number
          telefone: string | null
          updated_at: string
        }
        Insert: {
          board_id: string
          coluna_id: string
          created_at?: string
          id?: string
          nome_lead: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["card_origem"]
          posicao?: number
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          board_id?: string
          coluna_id?: string
          created_at?: string
          id?: string
          nome_lead?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["card_origem"]
          posicao?: number
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_cards_coluna_id_fkey"
            columns: ["coluna_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          board_id: string
          id: string
          is_padrao: boolean
          nome: string
          posicao: number
        }
        Insert: {
          board_id: string
          id?: string
          is_padrao?: boolean
          nome: string
          posicao: number
        }
        Update: {
          board_id?: string
          id?: string
          is_padrao?: boolean
          nome?: string
          posicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      membros: {
        Row: {
          created_at: string
          link_energia: string | null
          link_recrutamento: string | null
          modo_agente_ativo: Database["public"]["Enums"]["agente_modo"]
          nome_agente: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["membro_status"]
          usuario_id: string
        }
        Insert: {
          created_at?: string
          link_energia?: string | null
          link_recrutamento?: string | null
          modo_agente_ativo?: Database["public"]["Enums"]["agente_modo"]
          nome_agente?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["membro_status"]
          usuario_id: string
        }
        Update: {
          created_at?: string
          link_energia?: string | null
          link_recrutamento?: string | null
          modo_agente_ativo?: Database["public"]["Enums"]["agente_modo"]
          nome_agente?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["membro_status"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_conteudo: {
        Row: {
          cidade: string | null
          created_at: string
          nivel_experiencia:
            | Database["public"]["Enums"]["nivel_experiencia_conteudo"]
            | null
          nome_exibicao: string | null
          onboarding_completo: boolean
          publico_alvo: string | null
          tom_de_voz: Database["public"]["Enums"]["tom_voz_conteudo"] | null
          updated_at: string
          usuario_id: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          nivel_experiencia?:
            | Database["public"]["Enums"]["nivel_experiencia_conteudo"]
            | null
          nome_exibicao?: string | null
          onboarding_completo?: boolean
          publico_alvo?: string | null
          tom_de_voz?: Database["public"]["Enums"]["tom_voz_conteudo"] | null
          updated_at?: string
          usuario_id: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          nivel_experiencia?:
            | Database["public"]["Enums"]["nivel_experiencia_conteudo"]
            | null
          nome_exibicao?: string | null
          onboarding_completo?: boolean
          publico_alvo?: string | null
          tom_de_voz?: Database["public"]["Enums"]["tom_voz_conteudo"] | null
          updated_at?: string
          usuario_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfil_conteudo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          created_at: string
          email: string
          id: string
          nome_completo: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome_completo?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          connected_at: string | null
          id: string
          instance_name: string | null
          membro_id: string
          phone_number: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["whatsapp_status"]
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          id?: string
          instance_name?: string | null
          membro_id: string
          phone_number?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          id?: string
          instance_name?: string | null
          membro_id?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: true
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agente_conversas_aguardando_followup: {
        Args: Record<PropertyKey, never>
        Returns: {
          membro_id: string
          telefone_lead: string
          ultima_mensagem_em: string
        }[]
      }
      conteudo_ajustar_credito: {
        Args: { p_novo_saldo: number; p_usuario_id: string }
        Returns: {
          saldo_apos: number
        }[]
      }
      conteudo_registrar_geracao: {
        Args: {
          p_custo: number
          p_formato: Database["public"]["Enums"]["formato_conteudo"]
          p_modo_credito: string
          p_objetivo: Database["public"]["Enums"]["objetivo_conteudo"]
          p_prompt_final: string
          p_resultados: Json
          p_tema_livre: string
          p_tokens_consumidos: number
          p_usuario_id: string
        }
        Returns: {
          geracao_id: string
          saldo_apos: number
        }[]
      }
    }
    Enums: {
      agente_modo: "recrutamento" | "energia"
      card_origem: "manual" | "agente_ia"
      formato_conteudo:
        | "reels"
        | "legenda_post"
        | "stories"
        | "whatsapp_prospeccao"
      membro_status: "pendente" | "ativo" | "inativo"
      mensagem_remetente: "lead" | "agente"
      nivel_experiencia_conteudo: "iniciante" | "intermediario" | "lider"
      objetivo_conteudo:
        | "recrutamento"
        | "energia_assinatura"
        | "venda_produto"
        | "autoridade_pessoal"
      tipo_credito: "recarga" | "consumo" | "ajuste_admin"
      tom_voz_conteudo: "inspirador" | "direto" | "descontraido" | "autoridade"
      user_role: "admin" | "membro"
      whatsapp_status: "desconectado" | "aguardando_qr" | "conectado" | "erro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agente_modo: ["recrutamento", "energia"],
      card_origem: ["manual", "agente_ia"],
      formato_conteudo: [
        "reels",
        "legenda_post",
        "stories",
        "whatsapp_prospeccao",
      ],
      membro_status: ["pendente", "ativo", "inativo"],
      mensagem_remetente: ["lead", "agente"],
      nivel_experiencia_conteudo: ["iniciante", "intermediario", "lider"],
      objetivo_conteudo: [
        "recrutamento",
        "energia_assinatura",
        "venda_produto",
        "autoridade_pessoal",
      ],
      tipo_credito: ["recarga", "consumo", "ajuste_admin"],
      tom_voz_conteudo: ["inspirador", "direto", "descontraido", "autoridade"],
      user_role: ["admin", "membro"],
      whatsapp_status: ["desconectado", "aguardando_qr", "conectado", "erro"],
    },
  },
} as const

export type AgenteModo = Database["public"]["Enums"]["agente_modo"]
export type MembroStatus = Database["public"]["Enums"]["membro_status"]
export type UserRole = Database["public"]["Enums"]["user_role"]
export type WhatsappStatus = Database["public"]["Enums"]["whatsapp_status"]
export type ObjetivoConteudo = Database["public"]["Enums"]["objetivo_conteudo"]
export type FormatoConteudo = Database["public"]["Enums"]["formato_conteudo"]
export type TomVozConteudo = Database["public"]["Enums"]["tom_voz_conteudo"]
export type NivelExperienciaConteudo =
  Database["public"]["Enums"]["nivel_experiencia_conteudo"]
export type TipoCredito = Database["public"]["Enums"]["tipo_credito"]

// energia_leads.etapa é `text` com check constraint (não enum no banco) — união
// mantida à mão em paralelo à constraint da migration 0020_energia_leads_etapa.
export type EnergiaEtapa =
  | "aguardando_conta"
  | "aguardando_analise"
  | "aguardando_documento"
  | "aguardando_email"
  | "concluido"
