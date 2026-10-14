"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { solicitarAcessoRobo } from "./actions";
import type { RoboStatus } from "@/lib/types/database.types";

// Estados do robô para quem ainda não tem acesso liberado. Quando liberado, a
// página mostra o painel de conexão normal no lugar deste card.
export function RoboAcessoCard({
  status,
  motivo,
}: {
  status: Exclude<RoboStatus, "liberado">;
  motivo: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function solicitar() {
    startTransition(async () => {
      try {
        await solicitarAcessoRobo(aceito);
        toast.success("Solicitação enviada! Você será avisado quando for liberado.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível solicitar.");
      }
    });
  }

  if (status === "solicitado") {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" />
            Solicitação enviada
          </CardTitle>
          <CardDescription>
            Aguarde a liberação do administrador. Assim que liberar, a conexão do WhatsApp aparece
            aqui.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "revogado") {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4" />
            Robô bloqueado
          </CardTitle>
          <CardDescription>
            O acesso ao robô de WhatsApp foi revogado pelo administrador e seu número foi
            desconectado. Fale com seu líder para reativar.
          </CardDescription>
        </CardHeader>
        {motivo && (
          <CardContent className="text-sm text-muted-foreground">Motivo: {motivo}</CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4" />
          Robô de WhatsApp
        </CardTitle>
        <CardDescription>
          O robô responde quem chama você no WhatsApp, 24 horas por dia. O acesso é liberado pelo
          administrador, um membro de cada vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {motivo && (
          <p className="text-sm text-muted-foreground">
            Seu pedido anterior não foi aprovado. Motivo: {motivo}
          </p>
        )}
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setAceito(false);
          }}
        >
          <DialogTrigger render={<Button className="w-full sm:w-fit" />}>
            Solicitar acesso
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Termo de ciência</DialogTitle>
              <DialogDescription>Leia com atenção antes de solicitar.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <p>
                O robô conecta no seu WhatsApp por uma <strong>conexão não oficial</strong>{" "}
                (via QR Code). O WhatsApp não autoriza esse tipo de conexão e pode{" "}
                <strong>bloquear ou banir o seu número</strong>, temporária ou definitivamente.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Use, de preferência, um número exclusivo para prospecção.</li>
                <li>O robô serve para responder quem chamou você, não para disparo em massa.</li>
                <li>Existe um limite diário de respostas definido pelo administrador.</li>
                <li>
                  A ATL Prospect não se responsabiliza por bloqueios do número feitos pelo
                  WhatsApp.
                </li>
              </ul>
              <label className="flex items-start gap-2 rounded-lg border p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                  checked={aceito}
                  onChange={(e) => setAceito(e.target.checked)}
                />
                <span>Li e entendi o risco de bloqueio do meu número e quero solicitar o acesso.</span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={solicitar} disabled={!aceito || isPending}>
                Enviar solicitação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
