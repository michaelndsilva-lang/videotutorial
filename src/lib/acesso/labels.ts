import type { AgenteModo, MembroStatus, RoboStatus } from "@/lib/types/database.types";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export const MEMBRO_STATUS_LABEL: Record<MembroStatus, string> = {
  pendente: "Pendente",
  ativo: "Aprovado",
  recusado: "Recusado",
  suspenso: "Suspenso",
  inativo: "Suspenso", // legado (0027 converteu todos para 'suspenso')
};

export const MEMBRO_STATUS_VARIANT: Record<MembroStatus, BadgeVariant> = {
  pendente: "outline",
  ativo: "default",
  recusado: "destructive",
  suspenso: "secondary",
  inativo: "secondary",
};

export const ROBO_STATUS_LABEL: Record<RoboStatus, string> = {
  sem_acesso: "Sem acesso",
  solicitado: "Solicitado",
  liberado: "Liberado",
  revogado: "Revogado",
};

export const ROBO_STATUS_VARIANT: Record<RoboStatus, BadgeVariant> = {
  sem_acesso: "outline",
  solicitado: "secondary",
  liberado: "default",
  revogado: "destructive",
};

// Modos que o admin libera em robo_acesso ('sunne' tem gate próprio).
export const MODOS_ROBO_LABEL: Partial<Record<AgenteModo, string>> = {
  recrutamento: "Recrutamento",
  energia: "Energia",
};

export const LIMITE_DIARIO_PADRAO = 50;
