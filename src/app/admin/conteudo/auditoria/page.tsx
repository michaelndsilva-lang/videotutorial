import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { AuditoriaRow, type ItemAuditoria } from "./auditoria-row";

export default async function AdminConteudoAuditoriaPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("conteudo_geracoes")
    .select("id, objetivo, formato, tema_livre, prompt_final, resultado, created_at, usuarios(nome_completo, email)")
    // seq, não created_at — ver comentário em biblioteca/page.tsx.
    .order("seq", { ascending: false })
    .limit(50);

  const itens: ItemAuditoria[] = (data ?? []).map((row) => ({
    id: row.id,
    objetivo: row.objetivo,
    formato: row.formato,
    tema_livre: row.tema_livre,
    prompt_final: row.prompt_final,
    resultado: row.resultado,
    created_at: row.created_at,
    nome: row.usuarios?.nome_completo || row.usuarios?.email || "—",
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Motor de Conteúdo"
        title="Auditoria"
        description="Últimas 50 gerações de todos os membros, com o prompt exato enviado ao modelo — para revisão de qualidade e compliance."
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhuma geração ainda.
                  </TableCell>
                </TableRow>
              ) : (
                itens.map((item) => <AuditoriaRow key={item.id} item={item} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
