// Tipos da Evolution API (self-hosted). Escritos à mão — não vêm do Supabase.
// A API não documenta um schema OpenAPI estável entre versões, então os campos
// opcionais aqui refletem essa incerteza (ver riscos no plano de implementação).

export type EvolutionCreateInstanceResponse = {
  instance: { instanceName: string; status?: string };
  hash?: string;
  qrcode?: { base64?: string; code?: string; count?: number };
};

export type EvolutionConnectResponse = {
  base64?: string;
  code?: string;
  count?: number;
};

export type EvolutionConnectionState = "created" | "connecting" | "open" | "close";

export type EvolutionFetchInstanceInfo = {
  instanceName: string;
  ownerJid?: string | null;
  profileName?: string | null;
};

// ---- Payloads de webhook ----

export type EvolutionInboundMessage = {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  audioMessage?: { mimetype?: string; seconds?: number; ptt?: boolean };
  imageMessage?: { mimetype?: string; caption?: string };
  documentMessage?: { mimetype?: string; caption?: string; fileName?: string };
  // Formato usado por versões recentes do WhatsApp para documento enviado com
  // legenda — o documentMessage real fica aninhado um nível abaixo.
  documentWithCaptionMessage?: {
    message?: { documentMessage?: { mimetype?: string; caption?: string; fileName?: string } };
  };
  videoMessage?: { mimetype?: string; caption?: string };
  // Presente quando a instância foi criada com `webhook.base64: true` (mídia
  // já vem decodificada, sem precisar de uma segunda chamada).
  base64?: string;
};

export type EvolutionWebhookEvent =
  | { event: "qrcode.updated"; instance: string; data: { qrcode: { base64: string; code?: string; count?: number } } }
  | { event: "connection.update"; instance: string; data: { state: EvolutionConnectionState; statusReason?: number } }
  | {
      event: "messages.upsert";
      instance: string;
      data: {
        key: { remoteJid: string; fromMe: boolean; id: string };
        pushName?: string;
        messageType?: string;
        message?: EvolutionInboundMessage;
      };
    };

// Envelope bruto antes de sabermos qual `event` é — outros eventos que a
// Evolution possa enviar (fora dos 3 tratados) caem aqui e são ignorados.
export type EvolutionWebhookPayload = EvolutionWebhookEvent | { event: string; instance: string; data: unknown };
