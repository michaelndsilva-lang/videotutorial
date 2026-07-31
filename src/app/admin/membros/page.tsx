import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { MembroActions } from "./membro-actions";
import type { MembroStatus, WhatsappStatus } from "@/lib/types/database.types";

const STATUS_LABEL: Record<MembroStatus, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  inativo: "Inativo",
};

const STATUS_VARIANT: Record<MembroStatus, "default" | "secondary" | "outline"> = {
  pendente: "outline",
  ativo: "default",
  inativo: "secondary",
};

const WHATSAPP_LABEL: Record<WhatsappStatus, string> = {
  desconectado: "Desconectado",
  aguardando_qr: "Aguardando QR",
  conectado: "Conectado",
  erro: "Erro",
};

export default async function AdminMembrosPage() {
  const supabase = await createClient();

  const { data: membros } = await supabase
    .from("membros")
    .select(
      "usuario_id, status, created_at, usuarios(nome_completo, email), whatsapp_sessions(status)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>

      {!membros || membros.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhum membro ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assim que alguém se cadastrar em /cadastro, aparece aqui para aprovação.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membros.map((membro) => {
                  const nome = membro.usuarios?.nome_completo || membro.usuarios?.email || "—";
                  const whatsappStatus = membro.whatsapp_sessions?.status;

                  return (
                    <TableRow key={membro.usuario_id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/membros/${membro.usuario_id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {membro.usuarios?.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[membro.status]}>
                          {STATUS_LABEL[membro.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {whatsappStatus ? WHATSAPP_LABEL[whatsappStatus] : "—"}
                      </TableCell>
                      <TableCell>
                        <MembroActions
                          usuarioId={membro.usuario_id}
                          status={membro.status}
                          nome={nome}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
