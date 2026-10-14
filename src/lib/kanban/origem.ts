import type { CardOrigem } from "@/lib/types/database.types";

// Usado no navegador e no servidor.

export const ORIGENS: CardOrigem[] = ["manual", "agente_ia", "pagina", "simulador", "catalogo"];

export const ORIGEM_LABEL: Record<CardOrigem, string> = {
  manual: "Manual",
  agente_ia: "Agente IA",
  pagina: "Página",
  simulador: "Simulador",
  catalogo: "Catálogo",
};

// Paleta categórica validada com o validate_palette.js do skill dataviz
// (light: todas as checagens passam, contraste <3:1 em aqua/magenta exige
// rótulo visível — por isso o gráfico mostra as contagens por extenso; dark:
// tudo passa). Manual e Agente IA mantêm as cores que já usavam.
export const ORIGEM_COR: Record<CardOrigem, { light: string; dark: string }> = {
  manual: { light: "#2a78d6", dark: "#3987e5" },
  agente_ia: { light: "#B45309", dark: "#D97706" },
  pagina: { light: "#1baf7a", dark: "#199e70" },
  simulador: { light: "#6250d6", dark: "#9085e9" },
  catalogo: { light: "#e87ba4", dark: "#d55181" },
};

// Data de hoje em Brasília no formato YYYY-MM-DD (coluna proximo_followup é date).
export function hojeBrasilia(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function somarDias(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}${ano !== hojeBrasilia().slice(0, 4) ? `/${ano}` : ""}`;
}
