import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchEvolutionInstanceInfo,
  fetchEvolutionMediaBase64,
  sendEvolutionMedia,
  sendEvolutionText,
} from "@/lib/evolution/client";
import { gerarRespostaAgente, classificarRespostaAnaliseConta } from "@/lib/ai/agente";
import { transcreverAudioDoLead } from "@/lib/ai/audio";
import { normalizeTelefone, upsertLeadCard } from "@/lib/kanban/upsert-lead";
import {
  SUNNE_BUCKET,
  extrairVideosDaResposta,
  montarBaseConhecimento,
  montarInstrucaoVideos,
  type VideoCatalogo,
} from "@/lib/sunne/materiais";
import {
  CATALOGOS,
  CATALOGOS_BUCKET,
  extrairCatalogosDaResposta,
  montarInstrucaoCatalogos,
  type CatalogoDisponivel,
} from "@/lib/recrutamento/catalogos";
import type { EvolutionInboundMessage, EvolutionWebhookEvent } from "@/lib/evolution/types";
import type { CatalogoTipo, EnergiaEtapa } from "@/lib/types/database.types";

export const maxDuration = 60;

function normalizeQrBase64(base64: string): string {
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

// Extrai o anexo de mídia (imagem, documento ou vídeo) de uma mensagem, se
// houver. `documentWithCaptionMessage` é o formato usado por versões recentes
// do WhatsApp para documento enviado com legenda — o documentMessage real vem
// aninhado um nível abaixo.
function extrairMedia(
  message: EvolutionInboundMessage | undefined
): { tipo: "imagem" | "documento" | "vídeo"; caption?: string } | null {
  if (message?.imageMessage) return { tipo: "imagem", caption: message.imageMessage.caption };
  if (message?.documentMessage) return { tipo: "documento", caption: message.documentMessage.caption };
  const docComLegenda = message?.documentWithCaptionMessage?.message?.documentMessage;
  if (docComLegenda) return { tipo: "documento", caption: docComLegenda.caption };
  if (message?.videoMessage) return { tipo: "vídeo", caption: message.videoMessage.caption };
  return null;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const raw = (await request.json()) as { event?: string; instance?: string };
  // A Evolution manda o nome do evento em minúsculo pontuado ("messages.upsert"),
  // mas instâncias antigas foram cadastradas com o enum MAIÚSCULO_UNDERSCORE e
  // algumas versões ecoam esse formato no corpo. Normaliza os dois pra um só.
  const eventName = (raw.event ?? "").toLowerCase().replace(/_/g, ".");
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
  const payload = { ...raw, event: eventName } as EvolutionWebhookEvent;

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

        // Grupos (@g.us) ficam fora do MVP.
        if (key.remoteJid.endsWith("@g.us")) break;

        const telefoneLead = normalizeTelefone(key.remoteJid.split("@")[0]);

        const { data: membro } = await supabase
          .from("membros")
          .select("modo_agente_ativo, nome_agente, genero_agente, link_recrutamento, link_energia, sunne_habilitado")
          .eq("usuario_id", session.membro_id)
          .single();
        // Defesa extra: o trigger do banco já impede modo 'sunne' sem a
        // liberação, mas se ela for revogada com o modo ativo, cai no padrão.
        const modoConfigurado = membro?.modo_agente_ativo ?? "recrutamento";
        const modo =
          modoConfigurado === "sunne" && !membro?.sunne_habilitado ? "recrutamento" : modoConfigurado;

        // ------------------------------------------------------------------
        // Mensagens enviadas pelo próprio membro (fromMe), manualmente, no
        // WhatsApp dele. Fora do modo energia, nunca passam pelo agente (senão
        // ele responderia a si mesmo) — comportamento original, inalterado.
        // No modo energia, é o único jeito do sistema saber que o membro
        // aprovou (ou não) a conta de luz enquanto o robô está pausado
        // aguardando análise.
        // ------------------------------------------------------------------
        if (key.fromMe) {
          if (modo !== "energia") break;

          const textoHumano = message?.conversation ?? message?.extendedTextMessage?.text ?? "";
          if (!textoHumano) break;

          const { data: leadState } = await supabase
            .from("energia_leads")
            .select("etapa")
            .eq("membro_id", session.membro_id)
            .eq("telefone_lead", telefoneLead)
            .maybeSingle();

          // Só nos interessa uma mensagem manual quando o robô está pausado
          // esperando o veredito da análise — fora disso, é só o membro
          // conversando manualmente com o lead, nada pra classificar.
          if (leadState?.etapa !== "aguardando_analise") break;

          // Idempotência: retry do mesmo webhook não reclassifica de novo.
          const { data: jaProcessado } = await supabase
            .from("agente_mensagens")
            .select("id")
            .eq("membro_id", session.membro_id)
            .eq("telefone_lead", telefoneLead)
            .eq("whatsapp_message_id", key.id)
            .maybeSingle();
          if (jaProcessado) break;

          try {
            const classificacao = await classificarRespostaAnaliseConta(textoHumano);
            const novaEtapa: EnergiaEtapa | null =
              classificacao === "aprovado"
                ? "aguardando_documento"
                : classificacao === "reprovado"
                  ? "aguardando_conta"
                  : null; // "indefinido": continua pausado até um sinal mais claro

            if (novaEtapa) {
              const { error } = await supabase.from("energia_leads").upsert({
                membro_id: session.membro_id,
                telefone_lead: telefoneLead,
                etapa: novaEtapa,
              });
              if (error) throw error;
            }

            // Só marca esta mensagem como processada (dedup por
            // whatsapp_message_id) depois que a transição de etapa — quando
            // houver — foi aplicada com sucesso. Se o upsert acima falhar, a
            // inserção abaixo não roda, e uma reentrega do mesmo webhook
            // tenta classificar de novo em vez de ficar presa achando que já
            // processou algo que na verdade falhou.
            await supabase.from("agente_mensagens").insert({
              membro_id: session.membro_id,
              telefone_lead: telefoneLead,
              remetente: "agente",
              conteudo: textoHumano,
              whatsapp_message_id: key.id,
            });
          } catch (err) {
            console.error("Falha ao classificar resposta manual de análise da conta:", err);
          }

          break;
        }

        // ------------------------------------------------------------------
        // Mensagens do lead.
        // ------------------------------------------------------------------
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

        // Detecção de imagem/PDF/vídeo só é considerada no modo energia (é
        // onde a conta de luz e os documentos chegam) — no modo recrutamento
        // o comportamento continua exatamente o de antes: mídia sem texto é
        // ignorada.
        const media = modo === "energia" ? extrairMedia(message) : null;
        if (modo === "energia" && !texto && media?.caption) texto = media.caption;

        if (modo === "energia") {
          if (!texto && !media) break; // sticker, localização, contato, etc. — fora do MVP
        } else {
          if (!texto) break; // mensagens não-texto sem transcrição (imagem, etc.) fora do MVP
        }

        // Idempotência: se essa mensagem já foi respondida numa entrega anterior
        // do webhook (ver catch abaixo), não reprocessa nem duplica.
        const { data: leadExistente } = await supabase
          .from("agente_mensagens")
          .select("id, processado, created_at")
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

          // Quando a mensagem é só mídia sem legenda, `texto` fica vazio —
          // usamos um placeholder tanto pro histórico salvo quanto pro que é
          // passado à IA, já que `conteudo` é NOT NULL e a IA precisa de algum
          // conteúdo de usuário pra responder.
          const conteudoLead = texto || `[anexo enviado: ${media?.tipo}]`;

          let leadRowId = leadExistente?.id;
          let leadCreatedAt = leadExistente?.created_at;
          if (!leadRowId) {
            const { data: inserted } = await supabase
              .from("agente_mensagens")
              .insert({
                membro_id: session.membro_id,
                telefone_lead: telefoneLead,
                remetente: "lead",
                conteudo: conteudoLead,
                whatsapp_message_id: key.id,
                processado: false,
              })
              .select("id, created_at")
              .single();
            leadRowId = inserted?.id;
            leadCreatedAt = inserted?.created_at;
          }

          // Idempotência de envio: se uma entrega anterior deste mesmo webhook
          // (retry da Evolution) já gerou e enviou a resposta do agente, mas o
          // processo caiu antes de marcar `processado: true` (ver catch abaixo),
          // não gera nem envia a resposta de novo — só finaliza o processado.
          // Sem isso, cada retry gerava uma nova resposta da IA e mandava pro
          // lead de novo, resultando em mensagens duplicadas em sequência.
          if (leadRowId && leadCreatedAt) {
            const { data: respostaJaEnviada } = await supabase
              .from("agente_mensagens")
              .select("id")
              .eq("membro_id", session.membro_id)
              .eq("telefone_lead", telefoneLead)
              .eq("remetente", "agente")
              .gt("created_at", leadCreatedAt)
              .limit(1)
              .maybeSingle();

            if (respostaJaEnviada) {
              await supabase.from("agente_mensagens").update({ processado: true }).eq("id", leadRowId);
              break;
            }
          }

          // No modo energia, cada lead tem uma etapa no funil (conta -> análise
          // humana -> documento -> e-mail -> concluído). Enquanto está
          // aguardando análise, o robô fica em silêncio: quem responde o lead
          // nesse período é o próprio membro, manualmente (ver bloco `fromMe`
          // acima).
          let etapaEnergia: EnergiaEtapa | null = null;
          if (modo === "energia") {
            const { data: leadState } = await supabase
              .from("energia_leads")
              .select("etapa")
              .eq("membro_id", session.membro_id)
              .eq("telefone_lead", telefoneLead)
              .maybeSingle();
            etapaEnergia = (leadState?.etapa as EnergiaEtapa | undefined) ?? "aguardando_conta";

            if (etapaEnergia === "aguardando_analise") {
              if (leadRowId) {
                await supabase.from("agente_mensagens").update({ processado: true }).eq("id", leadRowId);
              }
              break;
            }
          }

          // Prompt: recrutamento/energia usam o prompt mestre compartilhado
          // (agentes_config, editado pelo admin); o SUNNE é exclusivo do
          // membro liberado e tem prompt, PDFs de conhecimento e vídeos
          // próprios (sunne_config/sunne_materiais).
          let promptSistema = "";
          let videosSunne: VideoCatalogo[] = [];
          let catalogosRecrutamento: CatalogoDisponivel[] = [];
          if (modo === "sunne") {
            const [{ data: sunneConfig }, { data: materiais }] = await Promise.all([
              supabase
                .from("sunne_config")
                .select("prompt_sistema")
                .eq("membro_id", session.membro_id)
                .maybeSingle(),
              supabase
                .from("sunne_materiais")
                .select("id, tipo, titulo, descricao, storage_path, mime_type, conteudo_texto")
                .eq("membro_id", session.membro_id)
                .order("created_at"),
            ]);
            videosSunne = (materiais ?? []).filter((m) => m.tipo === "video");
            promptSistema = [
              sunneConfig?.prompt_sistema ?? "",
              montarBaseConhecimento((materiais ?? []).filter((m) => m.tipo === "pdf")),
              montarInstrucaoVideos(videosSunne),
            ]
              .filter((bloco): bloco is string => Boolean(bloco?.trim()))
              .join("\n\n---\n\n");
          } else {
            const [{ data: config }, { data: catalogos }] = await Promise.all([
              supabase.from("agentes_config").select("prompt_sistema").eq("modo", modo).single(),
              // Recrutamento: PDFs LINHA DE PERFUMARIA / GUIA DE PRODUTOS
              // (recrutamento_catalogos, subidos pelo admin em /admin/agentes).
              modo === "recrutamento"
                ? supabase.from("recrutamento_catalogos").select("tipo, storage_path")
                : Promise.resolve({ data: [] as { tipo: string; storage_path: string }[] }),
            ]);
            catalogosRecrutamento = (catalogos ?? [])
              .filter((c) => c.tipo in CATALOGOS)
              .map((c) => ({ tipo: c.tipo as CatalogoTipo, storage_path: c.storage_path }));
            promptSistema = [config?.prompt_sistema ?? "", montarInstrucaoCatalogos(catalogosRecrutamento)]
              .filter((bloco): bloco is string => Boolean(bloco?.trim()))
              .join("\n\n---\n\n");
          }

          // Cada membro tem seu próprio link de cadastro/referral (Perfil >
          // Plataforma, "Seu link — Recrutamento/Energia", em membros) — leads
          // precisam ser atribuídos ao consultor certo, não a um link único
          // pra toda a consultoria. Se o membro ainda não configurou o dele,
          // cai pro link padrão da consultoria (configuracoes_gerais) como
          // fallback, em vez de deixar sem link nenhum.
          const linkPessoal = modo === "energia" ? membro?.link_energia : membro?.link_recrutamento;
          let linkCadastro = linkPessoal;
          if (!linkCadastro && modo !== "sunne") {
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

          // Contexto situacional injetado no prompt e etapa de destino, quando
          // essa mensagem representa uma transição no funil de energia. O
          // prompt_sistema (editável em /admin/agentes) já descreve o funil
          // inteiro — isso só avisa o modelo do que acabou de acontecer.
          let contextoAdicional: string | null = null;
          let proximaEtapa: EnergiaEtapa | null = null;
          // Delimitado por TLD de 2+ letras (em vez de "qualquer coisa até o
          // próximo espaço") pra não engolir pontuação de frase colada no
          // final, tipo a vírgula em "meu email é joao@gmail.com, obrigado".
          const emailMatch = texto.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-zA-Z]{2,}/);

          if (modo === "energia" && etapaEnergia) {
            if (media && etapaEnergia === "aguardando_conta") {
              contextoAdicional =
                "O lead acabou de enviar a conta de luz em anexo (imagem ou PDF). Confirme o recebimento de forma breve e informe que vai encaminhar para análise da equipe agora. Não peça mais nada nesta resposta nem avance para os próximos passos — a análise é manual e ainda não aconteceu.";
              proximaEtapa = "aguardando_analise";
            } else if (media && etapaEnergia === "aguardando_documento") {
              contextoAdicional =
                "O lead acabou de enviar o documento de identidade (RG ou CNH) em anexo. Confirme o recebimento e peça apenas o e-mail dele para a elaboração do contrato — o telefone já é este WhatsApp, não pergunte de novo.";
              proximaEtapa = "aguardando_email";
            } else if (etapaEnergia === "aguardando_email" && emailMatch) {
              contextoAdicional = `O lead acabou de informar o e-mail (${emailMatch[0]}). Confirme o recebimento e informe que o contrato será elaborado e enviado para esse e-mail em até 4 dias úteis, para assinatura online.`;
              proximaEtapa = "concluido";
            } else if (etapaEnergia === "aguardando_documento") {
              contextoAdicional =
                "Esta conversa já está na etapa de aguardar o envio do RG ou CNH do lead — a conta de luz já foi aprovada, não peça ela de novo.";
            } else if (etapaEnergia === "aguardando_email") {
              contextoAdicional = "Esta conversa já está na etapa de aguardar o e-mail do lead para a elaboração do contrato.";
            } else if (etapaEnergia === "concluido") {
              contextoAdicional =
                "O processo deste lead já está concluído (e-mail recebido, contrato a caminho). Continue a conversa normalmente a partir daqui, sem reiniciar o funil.";
            }
          }

          const resposta = await gerarRespostaAgente({
            promptSistema,
            nomeAgente: membro?.nome_agente,
            generoAgente: membro?.genero_agente as "masculino" | "feminino" | null | undefined,
            linkCadastro,
            historico,
            mensagemAtual: conteudoLead,
            contextoAdicional,
            semLinkCadastro: modo === "sunne",
          });

          // SUNNE: a resposta pode trazer marcações [[VIDEO:Vn]] — o texto vai
          // limpo e o vídeo escolhido segue logo depois, como mídia.
          // Recrutamento: idem com as marcações [[PDF:...]] dos catálogos.
          const { texto: textoSemVideos, videos: videosParaEnviar } =
            modo === "sunne"
              ? extrairVideosDaResposta(resposta, videosSunne)
              : { texto: resposta, videos: [] as VideoCatalogo[] };
          const { texto: textoResposta, catalogos: catalogosParaEnviar } =
            modo === "recrutamento"
              ? extrairCatalogosDaResposta(textoSemVideos, catalogosRecrutamento)
              : { texto: textoSemVideos, catalogos: [] as CatalogoDisponivel[] };

          if (textoResposta) {
            await sendEvolutionText(payload.instance, telefoneLead, textoResposta);
          }

          await supabase.from("agente_mensagens").insert({
            membro_id: session.membro_id,
            telefone_lead: telefoneLead,
            remetente: "agente",
            conteudo: textoResposta || (catalogosParaEnviar.length ? "[PDF]" : "[vídeo]"),
          });

          // Falha no envio do vídeo não derruba a conversa (o texto já foi):
          // só registra, sem devolver 500 — um retry reenviaria o texto.
          for (const video of videosParaEnviar) {
            try {
              const { data: signed, error: signedError } = await supabase.storage
                .from(SUNNE_BUCKET)
                .createSignedUrl(video.storage_path, 60 * 60);
              if (signedError || !signed) throw signedError ?? new Error("signed URL vazia");

              await sendEvolutionMedia(payload.instance, telefoneLead, {
                url: signed.signedUrl,
                mediatype: "video",
                mimetype: video.mime_type,
                fileName: `${video.titulo}.mp4`,
              });

              await supabase.from("agente_mensagens").insert({
                membro_id: session.membro_id,
                telefone_lead: telefoneLead,
                remetente: "agente",
                conteudo: `[vídeo enviado: ${video.titulo}]`,
              });
            } catch (err) {
              console.error(`Falha ao enviar vídeo SUNNE "${video.titulo}":`, err);
            }
          }

          // Mesma política dos vídeos: falha no PDF não derruba a conversa.
          for (const catalogo of catalogosParaEnviar) {
            const { nome } = CATALOGOS[catalogo.tipo];
            try {
              const { data: signed, error: signedError } = await supabase.storage
                .from(CATALOGOS_BUCKET)
                .createSignedUrl(catalogo.storage_path, 60 * 60);
              if (signedError || !signed) throw signedError ?? new Error("signed URL vazia");

              await sendEvolutionMedia(payload.instance, telefoneLead, {
                url: signed.signedUrl,
                mediatype: "document",
                mimetype: "application/pdf",
                fileName: `${nome}.pdf`,
              });

              await supabase.from("agente_mensagens").insert({
                membro_id: session.membro_id,
                telefone_lead: telefoneLead,
                remetente: "agente",
                conteudo: `[PDF enviado: ${nome}]`,
              });
            } catch (err) {
              console.error(`Falha ao enviar PDF "${nome}":`, err);
            }
          }

          if (leadRowId) {
            await supabase.from("agente_mensagens").update({ processado: true }).eq("id", leadRowId);
          }

          if (proximaEtapa) {
            await supabase.from("energia_leads").upsert({
              membro_id: session.membro_id,
              telefone_lead: telefoneLead,
              etapa: proximaEtapa,
            });
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
