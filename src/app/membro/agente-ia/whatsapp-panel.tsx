"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { QrCode, CheckCircle2, XCircle, Loader2, ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  conectarWhatsapp,
  conectarWhatsappPorNumero,
  desconectarWhatsapp,
} from "./actions";
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

// O WhatsApp mostra uma tela de "tentativa de golpe / você tem certeza?" ao
// vincular um aparelho. É uma proteção do próprio app, não um erro daqui —
// basta ler e tocar em "Continuar". Avisamos o membro para não travar nela.
function AvisoGolpe() {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <p>
        O WhatsApp pode exibir um alerta de segurança (&ldquo;tentativa de
        golpe&rdquo; ou &ldquo;você tem certeza?&rdquo;) antes de vincular. É
        normal — aguarde o contador e toque em <strong>Continuar</strong> /{" "}
        <strong>Sim, fui eu</strong> para concluir.
      </p>
    </div>
  );
}

export function WhatsappPanel({
  membroId,
  sessaoInicial,
}: {
  membroId: string;
  sessaoInicial: SessaoWhatsapp;
}) {
  const [sessao, setSessao] = useState(sessaoInicial);
  const [isPending, startTransition] = useTransition();
  const [metodo, setMetodo] = useState<"qr" | "numero">("qr");
  const [numero, setNumero] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);

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

  function resetFluxo() {
    setMetodo("qr");
    setNumero("");
    setPairingCode(null);
  }

  function handleConectar() {
    setPairingCode(null);
    setMetodo("qr");
    startTransition(async () => {
      try {
        await conectarWhatsapp();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível conectar.");
      }
    });
  }

  async function handleGerarCodigo() {
    setGerandoCodigo(true);
    try {
      const { pairingCode: code } = await conectarWhatsappPorNumero(numero);
      if (!code) {
        toast.error("A Evolution não retornou um código. Tente pelo QR Code.");
        return;
      }
      setPairingCode(code);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o código.");
    } finally {
      setGerandoCodigo(false);
    }
  }

  function handleDesconectar() {
    startTransition(async () => {
      try {
        await desconectarWhatsapp();
        setSessao({ status: "desconectado", qrCode: null, phoneNumber: null });
        resetFluxo();
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

  // Fluxo "Conectar com número de telefone" — mostra o código de pareamento.
  if (metodo === "numero" && pairingCode) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-full rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Seu código de pareamento</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.3em]">
            {pairingCode}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          No celular: WhatsApp → <strong>Aparelhos conectados</strong> →{" "}
          <strong>Conectar um aparelho</strong> →{" "}
          <strong>Conectar com número de telefone</strong>, e digite o código acima.
          Ele expira em poucos minutos.
        </p>
        <AvisoGolpe />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGerarCodigo}
            disabled={gerandoCodigo}
          >
            {gerandoCodigo ? "Gerando..." : "Gerar novo código"}
          </Button>
          <Button variant="ghost" onClick={resetFluxo} disabled={gerandoCodigo}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Fluxo "Conectar com número de telefone" — formulário do número.
  if (metodo === "numero") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Informe o número do WhatsApp que o agente vai usar, com código do país e DDD.
        </p>
        <Input
          type="tel"
          inputMode="numeric"
          placeholder="55 84 99999-9999"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          disabled={gerandoCodigo}
        />
        <div className="flex gap-2">
          <Button onClick={handleGerarCodigo} disabled={gerandoCodigo || numero.trim().length < 12}>
            {gerandoCodigo ? "Gerando..." : "Gerar código"}
          </Button>
          <Button variant="ghost" onClick={resetFluxo} disabled={gerandoCodigo}>
            Cancelar
          </Button>
        </div>
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
        <AvisoGolpe />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMetodo("numero");
              setPairingCode(null);
            }}
            disabled={isPending}
          >
            <Smartphone className="size-4" />
            Conectar com número
          </Button>
          <Button variant="ghost" onClick={handleDesconectar} disabled={isPending}>
            Cancelar
          </Button>
        </div>
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
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleConectar} disabled={isPending} className="self-start">
          <QrCode className="size-4" />
          {isPending ? "Gerando QR..." : "Conectar WhatsApp"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setMetodo("numero");
            setPairingCode(null);
          }}
          disabled={isPending}
          className="self-start"
        >
          <Smartphone className="size-4" />
          Conectar com número
        </Button>
      </div>
    </div>
  );
}
