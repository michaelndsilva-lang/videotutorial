import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { MembroActions, RoboActions } from "../membro-actions";
import { PatrocinadorForm } from "./patrocinador-form";
import {
  MEMBRO_STATUS_LABEL,
  MEMBRO_STATUS_VARIANT,
  MODOS_ROBO_LABEL,
  ROBO_STATUS_LABEL,
  ROBO_STATUS_VARIANT,
} from "@/lib/acesso/labels";
import { ACAO_LABEL, type AcaoAcesso } from "@/lib/acesso/log";
import type { WhatsappStatus } from "@/lib/types/database.types";

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
      "usuario_id, status, motivo_status, aprovado_em, patrocinador_id, codigo_convite, link_recrutamento, link_energia, observacoes, modo_agente_ativo, created_at, usuarios(nome_completo, email), whatsapp_sessions(status, phone_number), robo_acesso(status, modos_permitidos, limite_diario_mensagens, termo_aceito_em, solicitado_em, liberado_em, motivo_revogacao)"
    )
    .eq("usuario_id", id)
    .single();

  // Patrocinador: opções = membros aprovados (menos ele mesmo); ciclos são
  // barrados no banco.
  const [{ data: aprovados }, { count: indicados }] = await Promise.all([
    supabase
      .from("membros")
      .select("usuario_id, usuarios(nome_completo, email)")
      .eq("status", "ativo")
      .neq("usuario_id", id),
    supabase.from("membros").select("usuario_id", { count: "exact", head: true }).eq("patrocinador_id", id),
  ]);
  const opcoesPatrocinador = (aprovados ?? [])
    .map((m) => ({ id: m.usuario_id, nome: m.usuarios?.nome_completo || m.usuarios?.email || "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const { data: logs } = await supabase
    .from("access_logs")
    .select("id, acao, motivo, created_at")
    .eq("membro_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

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
          <Badge variant={MEMBRO_STATUS_VARIANT[membro.status]}>
            {MEMBRO_STATUS_LABEL[membro.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{membro.usuarios?.email}</p>
        {membro.aprovado_em && membro.status === "ativo" && (
          <p className="text-xs text-muted-foreground">
            Aprovado em {new Date(membro.aprovado_em).toLocaleDateString("pt-BR")}
          </p>
        )}
        {membro.motivo_status && membro.status !== "ativo" && (
          <p className="text-xs text-muted-foreground">Motivo: {membro.motivo_status}</p>
        )}
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
            <CardTitle className="text-base">Equipe</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-1.5">
              <p className="text-muted-foreground">Patrocinador (quem convidou)</p>
              <PatrocinadorForm
                usuarioId={membro.usuario_id}
                atual={membro.patrocinador_id}
                opcoes={opcoesPatrocinador}
              />
            </div>
            <p className="text-muted-foreground">
              {indicados ?? 0} indicado(s) direto(s) · código de convite{" "}
              <span className="font-mono text-foreground">{membro.codigo_convite}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Robô de WhatsApp
              {membro.robo_acesso && (
                <Badge variant={ROBO_STATUS_VARIANT[membro.robo_acesso.status]}>
                  {ROBO_STATUS_LABEL[membro.robo_acesso.status]}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {membro.robo_acesso ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Modos permitidos</p>
                    <p>
                      {membro.robo_acesso.modos_permitidos
                        .map((m) => MODOS_ROBO_LABEL[m] ?? m)
                        .join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Limite diário</p>
                    <p>{membro.robo_acesso.limite_diario_mensagens} respostas</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Termo de ciência</p>
                    <p>
                      {membro.robo_acesso.termo_aceito_em
                        ? `Aceito em ${new Date(membro.robo_acesso.termo_aceito_em).toLocaleDateString("pt-BR")}`
                        : "Não aceito (liberado antes da Fase 0)"}
                    </p>
                  </div>
                </div>
                {membro.robo_acesso.motivo_revogacao && (
                  <p className="text-muted-foreground">
                    Motivo: {membro.robo_acesso.motivo_revogacao}
                  </p>
                )}
                <RoboActions
                  usuarioId={membro.usuario_id}
                  nome={nome}
                  membroStatus={membro.status}
                  roboStatus={membro.robo_acesso.status}
                  modosPermitidos={membro.robo_acesso.modos_permitidos}
                  limite={membro.robo_acesso.limite_diario_mensagens}
                />
              </>
            ) : (
              <p className="text-muted-foreground">Sem registro de acesso ao robô.</p>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Histórico de acesso</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {logs && logs.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {logs.map((log) => (
                  <li key={log.id} className="flex flex-col">
                    <span>
                      {ACAO_LABEL[log.acao as AcaoAcesso] ?? log.acao}
                      <span className="text-muted-foreground">
                        {" "}
                        · {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </span>
                    {log.motivo && (
                      <span className="text-xs text-muted-foreground">Motivo: {log.motivo}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nenhuma ação registrada ainda.</p>
            )}
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
