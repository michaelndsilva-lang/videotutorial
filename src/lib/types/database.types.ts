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
      access_logs: {
        Row: {
          acao: string
          ator_id: string | null
          created_at: string
          detalhes: Json | null
          id: string
          membro_id: string | null
          motivo: string | null
        }
        Insert: {
          acao: string
          ator_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          membro_id?: string | null
          motivo?: string | null
        }
        Update: {
          acao?: string
          ator_id?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          membro_id?: string | null
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_ator_id_fkey"
            columns: ["ator_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
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
      aula_progresso: {
        Row: {
          aula_id: string
          concluido_em: string
          membro_id: string
        }
        Insert: {
          aula_id: string
          concluido_em?: string
          membro_id: string
        }
        Update: {
          aula_id?: string
          concluido_em?: string
          membro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_progresso_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aula_progresso_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      aulas: {
        Row: {
          ativo: boolean
          created_at: string
          curso_id: string
          descricao: string
          id: string
          ordem: number
          titulo: string
          updated_at: string
          video_url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          curso_id: string
          descricao?: string
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
          video_url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          curso_id?: string
          descricao?: string
          id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "aulas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
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
      cursos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string
          id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
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
          movido_em: string
          nome_lead: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["card_origem"]
          posicao: number
          proximo_followup: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          board_id: string
          coluna_id: string
          created_at?: string
          id?: string
          movido_em?: string
          nome_lead: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["card_origem"]
          posicao?: number
          proximo_followup?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          board_id?: string
          coluna_id?: string
          created_at?: string
          id?: string
          movido_em?: string
          nome_lead?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["card_origem"]
          posicao?: number
          proximo_followup?: string | null
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
      lead_consentimentos: {
        Row: {
          card_id: string | null
          created_at: string
          id: string
          interesse: string | null
          ip_hash: string | null
          membro_id: string
          nome: string
          origem: string
          telefone: string
          texto_consentimento: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          id?: string
          interesse?: string | null
          ip_hash?: string | null
          membro_id: string
          nome: string
          origem: string
          telefone: string
          texto_consentimento: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          id?: string
          interesse?: string | null
          ip_hash?: string | null
          membro_id?: string
          nome?: string
          origem?: string
          telefone?: string
          texto_consentimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_consentimentos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_consentimentos_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      materiais: {
        Row: {
          arquivo_path: string | null
          ativo: boolean
          categoria: string
          compartilhavel: boolean
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          mime_type: string | null
          nome_arquivo: string | null
          ordem: number
          permitir_download: boolean
          tamanho_bytes: number | null
          tipo: string
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          arquivo_path?: string | null
          ativo?: boolean
          categoria: string
          compartilhavel?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string | null
          ordem?: number
          permitir_download?: boolean
          tamanho_bytes?: number | null
          tipo: string
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          arquivo_path?: string | null
          ativo?: boolean
          categoria?: string
          compartilhavel?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string | null
          ordem?: number
          permitir_download?: boolean
          tamanho_bytes?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      membros: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          genero_agente: string | null
          link_energia: string | null
          link_recrutamento: string | null
          modo_agente_ativo: Database["public"]["Enums"]["agente_modo"]
          motivo_status: string | null
          nome_agente: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["membro_status"]
          sunne_habilitado: boolean
          usuario_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          genero_agente?: string | null
          link_energia?: string | null
          link_recrutamento?: string | null
          modo_agente_ativo?: Database["public"]["Enums"]["agente_modo"]
          motivo_status?: string | null
          nome_agente?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["membro_status"]
          sunne_habilitado?: boolean
          usuario_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          genero_agente?: string | null
          link_energia?: string | null
          link_recrutamento?: string | null
          modo_agente_ativo?: Database["public"]["Enums"]["agente_modo"]
          motivo_status?: string | null
          nome_agente?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["membro_status"]
          sunne_habilitado?: boolean
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
      mentor_config: {
        Row: {
          ativo: boolean
          id: number
          limite_diario: number
          prompt_sistema: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          id?: number
          limite_diario?: number
          prompt_sistema?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          id?: number
          limite_diario?: number
          prompt_sistema?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_documentos: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          created_by: string | null
          erro: string | null
          id: string
          nome_arquivo: string | null
          origem: string
          status: string
          titulo: string
          total_trechos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          created_by?: string | null
          erro?: string | null
          id?: string
          nome_arquivo?: string | null
          origem?: string
          status?: string
          titulo: string
          total_trechos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          created_by?: string | null
          erro?: string | null
          id?: string
          nome_arquivo?: string | null
          origem?: string
          status?: string
          titulo?: string
          total_trechos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_perguntas: {
        Row: {
          created_at: string
          id: string
          membro_id: string
          modelo: string | null
          pergunta: string
          resposta: string
          sem_base: boolean
          trechos: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          membro_id: string
          modelo?: string | null
          pergunta: string
          resposta: string
          sem_base?: boolean
          trechos?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          membro_id?: string
          modelo?: string | null
          pergunta?: string
          resposta?: string
          sem_base?: boolean
          trechos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "mentor_perguntas_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      mentor_trechos: {
        Row: {
          conteudo: string
          documento_id: string
          embedding: string
          id: string
          ordem: number
        }
        Insert: {
          conteudo: string
          documento_id: string
          embedding: string
          id?: string
          ordem: number
        }
        Update: {
          conteudo?: string
          documento_id?: string
          embedding?: string
          id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_trechos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "mentor_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      missao_progresso: {
        Row: {
          concluido_em: string
          membro_id: string
          missao_id: string
          resposta: string | null
        }
        Insert: {
          concluido_em?: string
          membro_id: string
          missao_id: string
          resposta?: string | null
        }
        Update: {
          concluido_em?: string
          membro_id?: string
          missao_id?: string
          resposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missao_progresso_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "missao_progresso_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          dia: number
          id: string
          ordem: number
          tipo_tarefa: string
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          dia: number
          id?: string
          ordem?: number
          tipo_tarefa?: string
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          dia?: number
          id?: string
          ordem?: number
          tipo_tarefa?: string
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      paginas: {
        Row: {
          bio: string
          created_at: string
          foto_path: string | null
          membro_id: string
          mostrar_energia: boolean
          mostrar_oportunidade: boolean
          mostrar_produtos: boolean
          publicada: boolean
          slug: string
          updated_at: string
          visitas: number
          whatsapp: string | null
        }
        Insert: {
          bio?: string
          created_at?: string
          foto_path?: string | null
          membro_id: string
          mostrar_energia?: boolean
          mostrar_oportunidade?: boolean
          mostrar_produtos?: boolean
          publicada?: boolean
          slug: string
          updated_at?: string
          visitas?: number
          whatsapp?: string | null
        }
        Update: {
          bio?: string
          created_at?: string
          foto_path?: string | null
          membro_id?: string
          mostrar_energia?: boolean
          mostrar_oportunidade?: boolean
          mostrar_produtos?: boolean
          publicada?: boolean
          slug?: string
          updated_at?: string
          visitas?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paginas_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: true
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
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
      recrutamento_catalogos: {
        Row: {
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recrutamento_catalogos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      robo_acesso: {
        Row: {
          liberado_em: string | null
          liberado_por: string | null
          limite_diario_mensagens: number
          membro_id: string
          modos_permitidos: Database["public"]["Enums"]["agente_modo"][]
          motivo_revogacao: string | null
          solicitado_em: string | null
          status: Database["public"]["Enums"]["robo_status"]
          termo_aceito_em: string | null
          updated_at: string
        }
        Insert: {
          liberado_em?: string | null
          liberado_por?: string | null
          limite_diario_mensagens?: number
          membro_id: string
          modos_permitidos?: Database["public"]["Enums"]["agente_modo"][]
          motivo_revogacao?: string | null
          solicitado_em?: string | null
          status?: Database["public"]["Enums"]["robo_status"]
          termo_aceito_em?: string | null
          updated_at?: string
        }
        Update: {
          liberado_em?: string | null
          liberado_por?: string | null
          limite_diario_mensagens?: number
          membro_id?: string
          modos_permitidos?: Database["public"]["Enums"]["agente_modo"][]
          motivo_revogacao?: string | null
          solicitado_em?: string | null
          status?: Database["public"]["Enums"]["robo_status"]
          termo_aceito_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robo_acesso_liberado_por_fkey"
            columns: ["liberado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "robo_acesso_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: true
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      script_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      script_usos: {
        Row: {
          acao: string
          created_at: string
          id: string
          membro_id: string
          script_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          membro_id: string
          script_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          membro_id?: string
          script_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_usos_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "script_usos_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          id: string
          ordem: number
          texto: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          id?: string
          ordem?: number
          texto: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          id?: string
          ordem?: number
          texto?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "script_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      sunne_config: {
        Row: {
          membro_id: string
          prompt_followup: string
          prompt_sistema: string
          updated_at: string
        }
        Insert: {
          membro_id: string
          prompt_followup?: string
          prompt_sistema?: string
          updated_at?: string
        }
        Update: {
          membro_id?: string
          prompt_followup?: string
          prompt_sistema?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunne_config_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: true
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      sunne_materiais: {
        Row: {
          conteudo_texto: string | null
          created_at: string
          descricao: string
          id: string
          membro_id: string
          mime_type: string
          storage_path: string
          tamanho_bytes: number
          tipo: string
          titulo: string
        }
        Insert: {
          conteudo_texto?: string | null
          created_at?: string
          descricao?: string
          id?: string
          membro_id: string
          mime_type: string
          storage_path: string
          tamanho_bytes: number
          tipo: string
          titulo: string
        }
        Update: {
          conteudo_texto?: string | null
          created_at?: string
          descricao?: string
          id?: string
          membro_id?: string
          mime_type?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sunne_materiais_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["usuario_id"]
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
      mentor_buscar_trechos: {
        Args: { p_embedding: string; p_limite?: number; p_minimo?: number }
        Returns: {
          conteudo: string
          documento_id: string
          id: string
          similaridade: number
          titulo: string
        }[]
      }
      registrar_visita_pagina: { Args: { p_slug: string }; Returns: undefined }
    }
    Enums: {
      agente_modo: "recrutamento" | "energia" | "sunne"
      card_origem: "manual" | "agente_ia" | "pagina" | "simulador" | "catalogo"
      formato_conteudo:
        | "reels"
        | "legenda_post"
        | "stories"
        | "whatsapp_prospeccao"
      membro_status: "pendente" | "ativo" | "inativo" | "recusado" | "suspenso"
      mensagem_remetente: "lead" | "agente"
      nivel_experiencia_conteudo: "iniciante" | "intermediario" | "lider"
      objetivo_conteudo:
        | "recrutamento"
        | "energia_assinatura"
        | "venda_produto"
        | "autoridade_pessoal"
      robo_status: "sem_acesso" | "solicitado" | "liberado" | "revogado"
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
      agente_modo: ["recrutamento", "energia", "sunne"],
      card_origem: ["manual", "agente_ia", "pagina", "simulador", "catalogo"],
      formato_conteudo: [
        "reels",
        "legenda_post",
        "stories",
        "whatsapp_prospeccao",
      ],
      membro_status: ["pendente", "ativo", "inativo", "recusado", "suspenso"],
      mensagem_remetente: ["lead", "agente"],
      nivel_experiencia_conteudo: ["iniciante", "intermediario", "lider"],
      objetivo_conteudo: [
        "recrutamento",
        "energia_assinatura",
        "venda_produto",
        "autoridade_pessoal",
      ],
      robo_status: ["sem_acesso", "solicitado", "liberado", "revogado"],
      tipo_credito: ["recarga", "consumo", "ajuste_admin"],
      tom_voz_conteudo: ["inspirador", "direto", "descontraido", "autoridade"],
      user_role: ["admin", "membro"],
      whatsapp_status: ["desconectado", "aguardando_qr", "conectado", "erro"],
    },
  },
} as const

// Não é um enum do Postgres (coluna text + check constraint) — não existe em Database["public"]["Enums"].
export type GeneroAgente = "masculino" | "feminino"
export type AgenteModo = Database["public"]["Enums"]["agente_modo"]
export type MembroStatus = Database["public"]["Enums"]["membro_status"]
export type UserRole = Database["public"]["Enums"]["user_role"]
export type WhatsappStatus = Database["public"]["Enums"]["whatsapp_status"]
export type CardOrigem = Database["public"]["Enums"]["card_origem"]
export type RoboStatus = Database["public"]["Enums"]["robo_status"]
export type RoboAcesso = Database["public"]["Tables"]["robo_acesso"]["Row"]
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

// sunne_materiais.tipo é `text` com check constraint (migration 0023_agente_sunne).
export type SunneMaterialTipo = "pdf" | "video"

// missoes.tipo_tarefa é `text` com check constraint (migration 0031_trilha).
export type TipoTarefa = "assistir" | "executar" | "responder"
export type Missao = Database["public"]["Tables"]["missoes"]["Row"]

// materiais.tipo é `text` com check constraint (migration 0029_materiais).
export type MaterialTipo = "pdf" | "apresentacao" | "imagem" | "video"
export type Material = Database["public"]["Tables"]["materiais"]["Row"]

// recrutamento_catalogos.tipo é `text` com check constraint (migration 0024_recrutamento_catalogos).
export type CatalogoTipo = "linha_perfumaria" | "guia_produtos"
