import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Envio do lead para um CRM externo, além do Kanban da ATL (que é o CRM
// principal). Fica DESLIGADO até existir CRM_WEBHOOK_URL nas variáveis de
// ambiente da Vercel. O token (CRM_WEBHOOK_TOKEN) só existe no servidor e vai
// no cabeçalho Authorization: Bearer — nunca chega ao navegador.
//
// Formato do corpo é provisório: quando a documentação da API do CRM chegar,
// ajustar `montarCorpo` (nomes dos campos) e, se preciso, o cabeçalho.

export type LeadCrm = {
  consentimentoId: string;
  nome: string;
  whatsapp: string;
  email: string;
  consultorId: string;
  consultorSlug: string;
  consultorNome: string;
  urlOrigem: string | null;
  utm: Record<string, string> | null;
  recebidoEm: string; // ISO, horário do servidor
};

const TENTATIVAS = 3;
const ESPERA_MS = [0, 1500, 5000];
const TIMEOUT_MS = 8000;

function montarCorpo(lead: LeadCrm) {
  return {
    nome_completo: lead.nome,
    whatsapp: lead.whatsapp,
    email: lead.email,
    id_consultor: lead.consultorId,
    slug_consultor: lead.consultorSlug,
    nome_consultor: lead.consultorNome,
    data_hora: lead.recebidoEm,
    url_origem: lead.urlOrigem,
    utm: lead.utm,
    origem: "site apresentação / bio link",
  };
}

export async function enviarLeadCrmExterno(lead: LeadCrm) {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) return; // integração desligada

  const token = process.env.CRM_WEBHOOK_TOKEN;
  let ultimoErro = "";
  for (let i = 0; i < TENTATIVAS; i++) {
    if (ESPERA_MS[i]) await new Promise((r) => setTimeout(r, ESPERA_MS[i]));
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Mesmo lead reenviado nas tentativas: o CRM pode usar isso para não duplicar.
          "Idempotency-Key": lead.consentimentoId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(montarCorpo(lead)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (resp.ok) {
        await registrar(lead.consentimentoId, null);
        return;
      }
      ultimoErro = `HTTP ${resp.status}`;
      // 4xx (menos 408/429) é erro de dados/credencial: repetir não resolve.
      if (resp.status < 500 && resp.status !== 408 && resp.status !== 429) break;
    } catch (error) {
      ultimoErro = error instanceof Error ? error.message : String(error);
    }
  }
  console.error("Falha ao enviar lead ao CRM externo:", ultimoErro);
  await registrar(lead.consentimentoId, ultimoErro.slice(0, 300));
}

async function registrar(consentimentoId: string, erro: string | null) {
  await createAdminClient()
    .from("lead_consentimentos")
    .update(erro ? { crm_erro: erro } : { crm_enviado_em: new Date().toISOString(), crm_erro: null })
    .eq("id", consentimentoId);
}
