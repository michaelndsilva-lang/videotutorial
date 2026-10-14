"use server";

import { headers } from "next/headers";
import { capturarLead, type Interesse, type ResultadoCaptura } from "@/lib/leads/capturar";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";

const INTERESSES: Interesse[] = ["negocio", "energia", "produtos"];

export async function enviarLeadPagina(slug: string, formData: FormData): Promise<ResultadoCaptura> {
  // Antispam: campo invisível preenchido (robô) ou envio rápido demais
  // (< 3 s depois de abrir a página) — finge sucesso para não ensinar o robô.
  const armadilha = String(formData.get("empresa") ?? "");
  const abertoEm = Number(formData.get("t") ?? 0);
  if (armadilha || !abertoEm || Date.now() - abertoEm < 3000) return { ok: true };

  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) return { ok: false, erro: "Página indisponível." };

  const interesse = String(formData.get("interesse") ?? "negocio") as Interesse;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  return capturarLead({
    membroId: pagina.membroId,
    origem: "pagina",
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    interesse: INTERESSES.includes(interesse) ? interesse : "negocio",
    consentiu: formData.get("consentimento") === "on",
    ip,
  });
}
