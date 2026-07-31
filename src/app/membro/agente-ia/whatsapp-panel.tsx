"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { QrCode, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { conectarWhatsapp, desconectarWhatsapp } from "./actions";
import type { WhatsappStatus } from "@/lib/types/database.types";

type SessaoWhatsapp = {
  status: WhatsappStatus;
  qrCode: string | null;
  phoneNumber: string | null;
};

const STATUS_LABEL: Record<WhatsappStatus, string> = {
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando QR",
  conectado: "Conectado",
  erro: "Erro na conexão",
};

export function WhatsappPanel({
  membroId,
  sessaoInicial,
}: {
  membroId: string;
  sessaoInicial: SessaoWhatsapp;
}) {
  const [sessao, setSessao] = useState(sessaoInicial);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`whatsapp_sessions:${membroId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_sessions",
          filter: `membro_id=eq.${membroId}`,
        },
        (payload) => {
          const row = payload.new as {
            status: WhatsappStatus;
            qr_code: string | null;
            phone_number: string | null;
          };
          setSessao({ status: row.status, qrCode: row.qr_code, phoneNumber: row.phone_number });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [membroId]);

  function handleConectar() {
    startTransition(async () => {
      try {
        await conectarWhatsapp();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível conectar.");
      }
    });
  }

  function handleDesconectar() {
    startTransition(async () => {
      try {
        await desconectarWhatsapp();
        setSessao({ status: "desconectado", qrCode: null, phoneNumber: null });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível desconectar.");
      }
    });
  }

  if (sessao.status === "conectado") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            {STATUS_LABEL[sessao.status]}
          </Badge>
          {sessao.phoneNumber && (
            <span className="text-sm text-muted-foreground">{sessao.phoneNumber}</span>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleDesconectar}
          disabled={isPending}
          className="self-start"
        >
          {isPending ? "Desconectando..." : "Desconectar"}
        </Button>
      </div>
    );
  }

  if (sessao.status === "aguardando_qr") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        {sessao.qrCode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sessao.qrCode}
            alt="QR Code para conectar o WhatsApp"
            className="size-56 rounded-lg border border-border"
          />
        ) : (
          <div className="flex size-56 items-center justify-center rounded-lg border border-border">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho, e escaneie o
          código acima.
        </p>
        <Button variant="outline" onClick={handleDesconectar} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant={sessao.status === "erro" ? "destructive" : "outline"}>
          {sessao.status === "erro" ? <XCircle className="size-3.5" /> : null}
          {STATUS_LABEL[sessao.status]}
        </Badge>
      </div>
      <Button onClick={handleConectar} disabled={isPending} className="self-start">
        <QrCode className="size-4" />
        {isPending ? "Gerando QR..." : "Conectar WhatsApp"}
      </Button>
    </div>
  );
}
