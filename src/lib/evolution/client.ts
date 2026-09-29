import "server-only";
import type {
  EvolutionConnectResponse,
  EvolutionCreateInstanceResponse,
  EvolutionFetchInstanceInfo,
} from "./types";

function baseUrl() {
  const url = process.env.EVOLUTION_API_URL;
  if (!url) throw new Error("EVOLUTION_API_URL não configurada.");
  return url.replace(/\/$/, "");
}

async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.EVOLUTION_API_KEY ?? "",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution API ${path} falhou (${res.status}): ${body}`);
  }

  return (await res.json()) as T;
}

function normalizeQrBase64(base64?: string): string | null {
  if (!base64) return null;
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

// Corpo do POST /instance/create, compartilhado pelos dois fluxos de conexão
// (QR e código por número). `extra` injeta campos como `number`, usado só no
// fluxo de pairing code.
function instanceCreateBody(instanceName: string, extra?: Record<string, unknown>) {
  return {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    ...extra,
    webhook: {
      url: `${process.env.APP_URL}/api/whatsapp/webhook`,
      // false: mídia (áudio, etc.) não vem embutida em base64 no payload
      // do webhook — payloads grandes estouravam o limite de corpo do
      // Vercel Functions (413) e a mensagem nunca chegava ao agente. O
      // webhook busca a mídia à parte via fetchEvolutionMediaBase64.
      base64: false,
      headers: { "x-webhook-secret": process.env.EVOLUTION_WEBHOOK_SECRET ?? "" },
      // Evolution API v2 valida os eventos contra um enum MAIÚSCULO_UNDERSCORE.
      // Com os nomes em minúsculo pontuado ("messages.upsert") a criação é
      // aceita mas nenhum evento é entregue — o webhook fica mudo e a sessão
      // nunca sai de "aguardando_qr". O corpo entregue ainda usa o formato
      // pontuado ("messages.upsert"), que é o que o route trata.
      events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
    },
  };
}

// Cria (ou reconecta) a instância do membro e retorna o QR inicial, se a
// própria criação já o trouxer. Caso não traga, busca via /instance/connect.
export async function createEvolutionInstance(
  instanceName: string
): Promise<{ qrCodeBase64: string | null }> {
  let created: EvolutionCreateInstanceResponse | null = null;
  try {
    created = await evolutionFetch<EvolutionCreateInstanceResponse>("/instance/create", {
      method: "POST",
      body: JSON.stringify(instanceCreateBody(instanceName)),
    });
  } catch (err) {
    // Instância já existe (ex.: desconexão anterior não removeu o registro na
    // Evolution API) — reaproveita a instância e pede um QR novo em vez de falhar.
    const message = err instanceof Error ? err.message : "";
    if (!message.includes("already in use")) throw err;
  }

  let qrCodeBase64 = normalizeQrBase64(created?.qrcode?.base64);

  if (!qrCodeBase64) {
    const connect = await evolutionFetch<EvolutionConnectResponse>(
      `/instance/connect/${instanceName}`
    );
    qrCodeBase64 = normalizeQrBase64(connect.base64);
  }

  return { qrCodeBase64 };
}

export async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  await evolutionFetch(`/instance/delete/${instanceName}`, { method: "DELETE" });
}

// Fluxo alternativo ao QR: o WhatsApp mostra menos vezes o aviso de "tentativa
// de golpe" quando o vínculo é feito por "Conectar com número de telefone".
// A Evolution só emite o `pairingCode` numa instância recém-criada com o número
// no corpo — então recriamos a instância do zero (descartando qualquer sessão
// presa antes) e lemos o código da resposta do /instance/create.
export async function connectEvolutionInstanceWithPhone(
  instanceName: string,
  phoneNumber: string
): Promise<{ pairingCode: string | null }> {
  const digits = phoneNumber.replace(/\D/g, "");

  // Best-effort: se a instância não existe, o delete falha — seguimos mesmo assim.
  try {
    await deleteEvolutionInstance(instanceName);
  } catch {
    // ignorado de propósito
  }

  const created = await evolutionFetch<EvolutionCreateInstanceResponse>("/instance/create", {
    method: "POST",
    body: JSON.stringify(instanceCreateBody(instanceName, { number: digits })),
  });

  let pairingCode = created.qrcode?.pairingCode ?? null;

  // Fallback: algumas versões só devolvem o código no /instance/connect seguinte.
  if (!pairingCode) {
    const connect = await evolutionFetch<EvolutionConnectResponse>(
      `/instance/connect/${instanceName}?number=${encodeURIComponent(digits)}`
    );
    pairingCode = connect.pairingCode ?? null;
  }

  return { pairingCode };
}

export async function logoutEvolutionInstance(instanceName: string): Promise<void> {
  await evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
}

export async function sendEvolutionText(
  instanceName: string,
  number: string,
  text: string
): Promise<void> {
  await evolutionFetch(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number, text }),
  });
}

// Envia mídia (hoje: vídeos do agente SUNNE) a partir de uma URL pública
// temporária (signed URL do Supabase Storage) — a Evolution baixa o arquivo.
export async function sendEvolutionMedia(
  instanceName: string,
  number: string,
  media: { url: string; mediatype: "video" | "image" | "document"; mimetype: string; fileName: string; caption?: string }
): Promise<void> {
  await evolutionFetch(`/message/sendMedia/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      mediatype: media.mediatype,
      mimetype: media.mimetype,
      media: media.url,
      fileName: media.fileName,
      caption: media.caption ?? "",
    }),
  });
}

// Fallback para quando o payload do webhook não trouxe `message.base64`
// inline (ex.: instância antiga, criada antes de `webhook.base64: true`).
export async function fetchEvolutionMediaBase64(
  instanceName: string,
  messageId: string
): Promise<{ base64: string; mimetype?: string } | null> {
  const result = await evolutionFetch<{ base64?: string; mimetype?: string }>(
    `/chat/getBase64FromMediaMessage/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    }
  );
  return result.base64 ? { base64: result.base64, mimetype: result.mimetype } : null;
}

// Usado pelo webhook para tentar obter o número do dono ao conectar, quando o
// próprio payload de CONNECTION_UPDATE não o inclui (ver riscos do plano).
export async function fetchEvolutionInstanceInfo(
  instanceName: string
): Promise<EvolutionFetchInstanceInfo | null> {
  const list = await evolutionFetch<EvolutionFetchInstanceInfo[]>(
    `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`
  );
  return list[0] ?? null;
}
