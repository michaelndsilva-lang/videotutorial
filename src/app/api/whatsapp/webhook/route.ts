import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchEvolutionInstanceInfo,
  fetchEvolutionMediaBase64,
  sendEvolutionText,
} from "@/lib/evolution/client";
import { gerarRespostaAgente } from "@/lib/ai/agente";
import { transcreverAudioDoLead } from "@/lib/ai/audio";
import { normalizeTelefone, upsertLeadCard } from "@/lib/kanban/upsert-lead";
import type { EvolutionWebhookEvent } from "@/lib/evolution/types";

export const maxDuration = 60;

function normalizeQrBase64(base64: string): string {
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const raw = (await request.json()) as { event?: string; instance?: string };
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("membro_id, status")
    .eq("instance_name", raw.instance ?? "")
    .single();

  // Instância desconhecida (ex.: instância de teste manual, ou já removida) — 200 pra evitar retry-storm.
  if (!session) {
    return Response.json({ ok: true });
  }

  // Só aqui sabemos que é uma instância conhecida; tratamos o payload como um
  // dos 3 eventos suportados (evento desconhecido cai no `default` abaixo).
  const payload = raw as EvolutionWebhookEvent;

  try {
    switch (payload.event) {
      case "qrcode.updated": {
        await supabase
          .from("whatsapp_sessions")
          .update({
            qr_code: normalizeQrBase64(payload.data.qrcode.base64),
            status: "aguardando_qr",
          })
          .eq("instance_name", payload.instance);
        break;
      }

      case "connection.update": {
        const { state, statusReason } = payload.data;

        if (state === "open") {
          let phoneNumber: string | null = null;
          try {
            const info = await fetchEvolutionInstanceInfo(payload.instance);
            phoneNumber = info?.ownerJid ? normalizeTelefone(info.ownerJid) : null;
          } catch (err) {
            console.error("Falha ao buscar número da instância conectada:", err);
          }

          await supabase
            .from("whatsapp_sessions")
            .update({
              status: "conectado",
              qr_code: null,
              phone_number: phoneNumber,
              connected_at: new Date().toISOString(),
            })
            .eq("instance_name", payload.instance);
        } else if (state === "close") {
          // statusReason 200 == logout limpo; qualquer outro valor indica queda inesperada.
          await supabase
            .from("whatsapp_sessions")
            .update({ status: statusReason === 200 ? "desconectado" : "erro" })
            .eq("instance_name", payload.instance);
        }
        break;
      }

      case "messages.upsert": {
        const { key, message, pushName } = payload.data;

        // Mensagens enviadas pelo próprio membro (fromMe) não passam pelo agente,
        // senão ele responderia a si mesmo. Grupos (@g.us) ficam fora do MVP.
        if (key.fromMe || key.remoteJid.endsWith("@g.us")) break;

        let texto = message?.conversation ?? message?.extendedTextMessage?.text ?? "";

        if (!texto && message?.audioMessage) {
          const media =
            message.base64 && message.audioMessage.mimetype
              ? { base64: message.base64, mimetype: message.audioMessage.mimetype }
              : await fetchEvolutionMediaBase64(payload.instance, key.id).then((m) =>
                  m ? { base64: m.base64, mimetype: m.mimetype ?? message.audioMessage?.mimetype ?? "audio/ogg" } : null
                );

          if (media) {
            try {
              texto = await transcreverAudioDoLead(media.base64, media.mimetype);
            } catch (err) {
              console.error("Falha ao transcrever áudio com Gemini:", err);
            }
          }
        }

        if (!texto) break; // mensagens não-texto sem transcrição (imagem, etc.) fora do MVP

        const telefoneLead = normalizeTelefone(key.remoteJid.split("@")[0]);

        // Idempotência: se essa mensagem já foi respondida numa entrega anterior
        // do webhook (ver catch abaixo), não reprocessa nem duplica.
        const { data: leadExistente } = await supabase
          .from("agente_mensagens")
          .select("id, processado")
          .eq("membro_id", session.membro_id)
          .eq("telefone_lead", telefoneLead)
          .eq("whatsapp_message_id", key.id)
          .maybeSingle();

        if (leadExistente?.processado) break; // já respondida numa tentativa anterior

        try {
          const { data: historicoRows } = await supabase
            .from("agente_mensagens")
            .select("id, remetente, conteudo")
            .eq("membro_id", session.membro_id)
            .eq("telefone_lead", telefoneLead)
            .order("created_at", { ascending: false })
            .limit(20);
          const historico = (historicoRows ?? [])
            .filter((m) => m.id !== leadExistente?.id)
            .reverse();

          let leadRowId = leadExistente?.id;
          if (!leadRowId) {
            const { data: inserted } = await supabase
              .from("agente_mensagens")
              .insert({
                membro_id: session.membro_id,
                telefone_lead: telefoneLead,
                remetente: "lead",
                conteudo: texto,
                whatsapp_message_id: key.id,
                processado: false,
              })
              .select("id")
              .single();
            leadRowId = inserted?.id;
          }

          const { data: membro } = await supabase
            .from("membros")
            .select("modo_agente_ativo, nome_agente, link_recrutamento, link_energia")
            .eq("usuario_id", session.membro_id)
            .single();
          const modo = membro?.modo_agente_ativo ?? "recrutamento";

          const { data: config } = await supabase
            .from("agentes_config")
            .select("prompt_sistema")
            .eq("modo", modo)
            .single();

          // Cada membro tem seu próprio link de cadastro/referral (Perfil >
          // Plataforma, "Seu link — Recrutamento/Energia", em membros) — leads
          // precisam ser atribuídos ao consultor certo, não a um link único
          // pra toda a consultoria. Se o membro ainda não configurou o dele,
          // cai pro link padrão da consultoria (configuracoes_gerais) como
          // fallback, em vez de deixar sem link nenhum.
          const linkPessoal = modo === "energia" ? membro?.link_energia : membro?.link_recrutamento;
          let linkCadastro = linkPessoal;
          if (!linkCadastro) {
            const { data: configuracoes } = await supabase
              .from("configuracoes_gerais")
              .select("link_recrutamento_padrao, link_energia_padrao")
              .limit(1)
              .single();
            linkCadastro =
              modo === "energia"
                ? configuracoes?.link_energia_padrao
                : configuracoes?.link_recrutamento_padrao;
          }

          const resposta = await gerarRespostaAgente({
            promptSistema: config?.prompt_sistema ?? "",
            nomeAgente: membro?.nome_agente,
            linkCadastro,
            historico,
            mensagemAtual: texto,
          });

          await sendEvolutionText(payload.instance, telefoneLead, resposta);

          await supabase.from("agente_mensagens").insert({
            membro_id: session.membro_id,
            telefone_lead: telefoneLead,
            remetente: "agente",
            conteudo: resposta,
          });

          if (leadRowId) {
            await supabase.from("agente_mensagens").update({ processado: true }).eq("id", leadRowId);
          }

          await upsertLeadCard(supabase, {
            membroId: session.membro_id,
            modo,
            telefone: telefoneLead,
            nomeLead: pushName || telefoneLead,
          });
        } catch (err) {
          // Diferente dos outros eventos: aqui devolvemos erro de propósito.
          // Uma conversa não pode simplesmente parar por causa de uma falha
          // transiente (rate limit do provider de IA, timeout, etc.) — a
          // Evolution reentrega webhooks com falha automaticamente (com
          // backoff, até 10 tentativas ao longo de vários minutos), e como a
          // mensagem do lead já foi salva com `processado: false`, o reprocessamento
          // retoma do ponto certo sem duplicar nada.
          console.error("Falha ao gerar/enviar resposta do agente:", err);
          return new Response("erro ao processar mensagem", { status: 500 });
        }

        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Erro processando webhook da Evolution API:", err);
  }

  return Response.json({ ok: true });
}
