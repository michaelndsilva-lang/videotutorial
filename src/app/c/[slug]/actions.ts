"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import {
  capturarLead,
  normalizarEmail,
  normalizarTelefoneBR,
  TEXTO_CONSENTIMENTO_BIO,
  type Interesse,
  type ResultadoCaptura,
} from "@/lib/leads/capturar";
import { enviarLeadCrmExterno } from "@/lib/leads/crm-externo";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { carregarConfigSimulador } from "@/lib/energia/proposta";
import { carregarProdutoPublico } from "@/lib/catalogo/publico";
import { brl, simular } from "@/lib/energia/simulador";

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

  // "Tenho interesse" na página de um produto: lead do catálogo com o produto anotado.
  const produtoId = String(formData.get("produto_id") ?? "");
  const produto = produtoId && pagina.mostrarProdutos ? await carregarProdutoPublico(produtoId) : null;
  if (produto) {
    return capturarLead({
      membroId: pagina.membroId,
      origem: "catalogo",
      nome: String(formData.get("nome") ?? ""),
      telefone: String(formData.get("telefone") ?? ""),
      interesse: "produtos",
      observacao: `Produto: ${produto.nome}`,
      consentiu: formData.get("consentimento") === "on",
      ip,
    });
  }

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

const UTM_CHAVES = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

// Só guarda a URL se for desta página (o navegador manda; não confiar cegamente).
function lerOrigem(slug: string, bruto: string) {
  try {
    const url = new URL(bruto);
    if (!url.pathname.startsWith(`/c/${slug}`)) return { urlOrigem: null, utm: null };
    const utm: Record<string, string> = {};
    for (const k of UTM_CHAVES) {
      const v = url.searchParams.get(k);
      if (v) utm[k] = v.slice(0, 200);
    }
    return { urlOrigem: url.toString().slice(0, 1000), utm };
  } catch {
    return { urlOrigem: null, utm: null };
  }
}

// Formulário "Vamos conversar?" da página principal (link na bio):
// nome, WhatsApp e e-mail obrigatórios. O lead vai para o Kanban do
// consultor (CRM da ATL) e, se configurado, também para o CRM externo.
export async function enviarLeadBio(slug: string, formData: FormData): Promise<ResultadoCaptura> {
  const armadilha = String(formData.get("empresa") ?? "");
  const abertoEm = Number(formData.get("t") ?? 0);
  if (armadilha || !abertoEm || Date.now() - abertoEm < 3000) return { ok: true };

  const pagina = await carregarPaginaPublica(slug);
  if (!pagina) return { ok: false, erro: "Esta página não está mais disponível." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const { urlOrigem, utm } = lerOrigem(slug, String(formData.get("url_origem") ?? ""));
  const nome = String(formData.get("nome") ?? "");
  const telefone = String(formData.get("telefone") ?? "");
  const email = String(formData.get("email") ?? "");

  const r = await capturarLead({
    membroId: pagina.membroId,
    origem: "pagina",
    nome,
    telefone,
    email,
    exigirEmail: true,
    interesse: "negocio",
    observacao: [
      "Origem: site apresentação / bio link",
      utm?.utm_source && `Campanha: ${[utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean).join(" / ")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    consentiu: formData.get("consentimento") === "on",
    textoConsentimento: TEXTO_CONSENTIMENTO_BIO,
    urlOrigem,
    utm,
    ip,
  });

  // CRM externo depois da resposta: o visitante não espera as tentativas.
  if (r.ok && r.consentimentoId) {
    const lead = {
      consentimentoId: r.consentimentoId,
      nome: nome.trim().slice(0, 80),
      whatsapp: normalizarTelefoneBR(telefone)!,
      email: normalizarEmail(email)!,
      consultorId: pagina.membroId,
      consultorSlug: pagina.slug,
      consultorNome: pagina.nome,
      urlOrigem,
      utm,
      recebidoEm: new Date().toISOString(),
    };
    after(() => enviarLeadCrmExterno(lead));
  }
  return r;
}

// "Quero aderir" do simulador público: lead de energia com a simulação
// anotada no card, para o membro já chegar sabendo o valor da conta.
export async function enviarLeadSimulador(slug: string, formData: FormData): Promise<ResultadoCaptura> {
  const armadilha = String(formData.get("empresa") ?? "");
  const abertoEm = Number(formData.get("t") ?? 0);
  if (armadilha || !abertoEm || Date.now() - abertoEm < 3000) return { ok: true };

  const pagina = await carregarPaginaPublica(slug);
  if (!pagina?.mostrarEnergia) return { ok: false, erro: "Página indisponível." };

  const valor = Number(formData.get("valor") ?? 0);
  const uf = String(formData.get("uf") ?? "").slice(0, 2).toUpperCase();
  const config = await carregarConfigSimulador();
  const r = simular(valor, uf, config);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  return capturarLead({
    membroId: pagina.membroId,
    origem: "simulador",
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    interesse: "energia",
    observacao: `Simulação: conta de ${brl(valor)}${uf ? ` (${uf})` : ""}, economia estimada de ${brl(r.economiaMensal)}/mês.`,
    consentiu: formData.get("consentimento") === "on",
    ip,
  });
}
