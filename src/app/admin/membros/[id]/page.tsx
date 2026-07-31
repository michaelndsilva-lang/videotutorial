import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { MembroActions } from "../membro-actions";
import type { MembroStatus, WhatsappStatus } from "@/lib/types/database.types";

const STATUS_LABEL: Record<MembroStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  inativo: "Inativo",
};

const WHATSAPP_LABEL: Record<WhatsappStatus, string> = {
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando QR",
  conectado: "Conectado",
  erro: "Erro",
};

export default async function AdminMembroDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: membro } = await supabase
    .from("membros")
    .select(
      "usuario_id, status, link_recrutamento, link_energia, observacoes, modo_agente_ativo, created_at, usuarios(nome_completo, email), whatsapp_sessions(status, phone_number)"
    )
    .eq("usuario_id", id)
    .single();

  if (!membro) {
    notFound();
  }

  const nome = membro.usuarios?.nome_completo || membro.usuarios?.email || "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/membros"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{nome}</h1>
          <Badge variant="outline">{STATUS_LABEL[membro.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{membro.usuarios?.email}</p>
      </div>

      <MembroActions usuarioId={membro.usuario_id} status={membro.status} nome={nome} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links de cadastro</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Recrutamento</p>
              <p className="break-all">{membro.link_recrutamento || "Não informado"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Energia</p>
              <p className="break-all">{membro.link_energia || "Não informado"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agente de IA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Modo ativo</p>
              <p className="capitalize">{membro.modo_agente_ativo}</p>
            </div>
            <div>
              <p className="text-muted-foreground">WhatsApp</p>
              <p>
                {membro.whatsapp_sessions
                  ? WHATSAPP_LABEL[membro.whatsapp_sessions.status]
                  : "Não conectado"}
                {membro.whatsapp_sessions?.phone_number
                  ? ` — ${membro.whatsapp_sessions.phone_number}`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Observações do membro</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
            {membro.observacoes || "Nenhuma observação registrada."}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
