import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CardOrigem } from "@/lib/types/database.types";

// Captura de lead dos formulários públicos (página pessoal, simulador,
// catálogo). Roda com service-role: o visitante não tem login.

export const TEXTO_CONSENTIMENTO =
  "Autorizo o consultor a entrar em contato comigo pelo WhatsApp sobre os produtos e serviços da Atlântica Natural e confirmo que li a Política de Privacidade.";

// Texto do formulário "Vamos conversar?" da página principal (/c/<slug>).
// Fica gravado no registro do consentimento exatamente como foi exibido.
export const TEXTO_CONSENTIMENTO_BIO =
  "Ao enviar seus dados, você declara estar ciente de que suas informações serão utilizadas para responder à sua solicitação e permitir o contato do consultor responsável, conforme nossa Política de Privacidade.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizarEmail(valor: string): string | null {
  const email = valor.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export type Interesse = "negocio" | "energia" | "produtos";

export const INTERESSE_LABEL: Record<Interesse, string> = {
  negocio: "Oportunidade de negócio",
  energia: "Economia na conta de luz",
  produtos: "Produtos",
};

const MAX_POR_IP_HORA = 5;

// Celular/fixo BR: aceita com ou sem 55; guarda sempre com DDI.
export function normalizarTelefoneBR(valor: string): string | null {
  let d = valor.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (!/^55\d{10,11}$/.test(d)) return null;
  return d;
}

function hashIp(ip: string | null) {
  if (!ip) return null;
  const sal = process.env.LEAD_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex");
}

export type ResultadoCaptura =
  | { ok: true; consentimentoId?: string; cardId?: string | null }
  | { ok: false; erro: string; campo?: "nome" | "telefone" | "email" | "consentimento" };

export async function capturarLead(input: {
  membroId: string;
  origem: Extract<CardOrigem, "pagina" | "simulador" | "catalogo">;
  nome: string;
  telefone: string;
  interesse: Interesse;
  observacao?: string;
  consentiu: boolean;
  ip: string | null;
  // Campos do formulário da página principal (opcionais nos demais).
  email?: string;
  exigirEmail?: boolean;
  textoConsentimento?: string;
  urlOrigem?: string | null;
  utm?: Record<string, string> | null;
}): Promise<ResultadoCaptura> {
  const nome = input.nome.trim().slice(0, 80);
  const telefone = normalizarTelefoneBR(input.telefone);
  const email = input.email?.trim() ? normalizarEmail(input.email) : null;
  if (nome.length < 2) return { ok: false, erro: "Informe seu nome completo.", campo: "nome" };
  if (!telefone) return { ok: false, erro: "Informe um WhatsApp válido com DDD.", campo: "telefone" };
  if (input.email?.trim() && !email) return { ok: false, erro: "Informe um e-mail válido.", campo: "email" };
  if (input.exigirEmail && !email) return { ok: false, erro: "Informe seu e-mail.", campo: "email" };
  if (!input.consentiu) {
    return { ok: false, erro: "Marque a caixa de ciência para enviar.", campo: "consentimento" };
  }

  const admin = createAdminClient();
  const ipHash = hashIp(input.ip);
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (ipHash) {
    const { count } = await admin
      .from("lead_consentimentos")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", umaHoraAtras);
    if ((count ?? 0) >= MAX_POR_IP_HORA) {
      return { ok: false, erro: "Muitos envios em sequência. Tente de novo mais tarde." };
    }
  }

  // Mesmo telefone para o mesmo membro nas últimas 24h: não duplica o card.
  const { data: repetido } = await admin
    .from("lead_consentimentos")
    .select("id")
    .eq("membro_id", input.membroId)
    .eq("telefone", telefone)
    .gte("created_at", umDiaAtras)
    .limit(1)
    .maybeSingle();

  let cardId: string | null = null;
  if (!repetido) {
    const modo = input.interesse === "energia" ? "energia" : "recrutamento";
    const { data: board } = await admin
      .from("kanban_boards")
      .select("id")
      .eq("membro_id", input.membroId)
      .eq("modo", modo)
      .single();
    if (!board) return { ok: false, erro: "Não foi possível enviar agora. Tente pelo WhatsApp." };

    const { data: coluna } = await admin
      .from("kanban_columns")
      .select("id")
      .eq("board_id", board.id)
      .order("posicao")
      .limit(1)
      .single();
    if (!coluna) return { ok: false, erro: "Não foi possível enviar agora. Tente pelo WhatsApp." };

    const { data: ultimo } = await admin
      .from("kanban_cards")
      .select("posicao")
      .eq("coluna_id", coluna.id)
      .order("posicao", { ascending: false })
      .limit(1)
      .maybeSingle();

    const observacoes = [
      `Interesse: ${INTERESSE_LABEL[input.interesse]}`,
      email && `E-mail: ${email}`,
      input.observacao?.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    const { data: card, error } = await admin
      .from("kanban_cards")
      .insert({
        board_id: board.id,
        coluna_id: coluna.id,
        nome_lead: nome,
        telefone,
        origem: input.origem,
        observacoes,
        posicao: (ultimo?.posicao ?? -1) + 1,
      })
      .select("id")
      .single();
    if (error) {
      console.error("Falha ao criar card do lead:", error);
      return { ok: false, erro: "Não foi possível enviar agora. Tente pelo WhatsApp." };
    }
    cardId = card.id;
  }

  const { data: consentimento, error: consentError } = await admin
    .from("lead_consentimentos")
    .insert({
      membro_id: input.membroId,
      card_id: cardId,
      origem: input.origem,
      nome,
      telefone,
      email,
      interesse: input.interesse,
      texto_consentimento: input.textoConsentimento ?? TEXTO_CONSENTIMENTO,
      ip_hash: ipHash,
      url_origem: input.urlOrigem?.slice(0, 1000) || null,
      utm: input.utm && Object.keys(input.utm).length ? input.utm : null,
    })
    .select("id")
    .single();
  if (consentError) console.error("Falha ao registrar consentimento:", consentError);

  return { ok: true, consentimentoId: consentimento?.id, cardId };
}
