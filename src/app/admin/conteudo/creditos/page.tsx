import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ConfigCreditosForm } from "./config-form";
import { CreditosTable, type LinhaCredito } from "./creditos-table";

export default async function AdminConteudoCreditosPage() {
  const supabase = await createClient();

  const [{ data: config }, { data: membros }, { data: extrato }] = await Promise.all([
    supabase
      .from("configuracoes_gerais")
      .select("modo_credito, creditos_mensais_padrao, custo_por_geracao, modelo_ia_conteudo")
      .limit(1)
      .single(),
    supabase
      .from("membros")
      .select("usuario_id, usuarios(nome_completo, email)")
      .order("created_at"),
    supabase
      .from("creditos_extrato")
      .select("usuario_id, saldo_apos, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const saldoPorUsuario = new Map<string, number>();
  for (const row of extrato ?? []) {
    if (!saldoPorUsuario.has(row.usuario_id)) saldoPorUsuario.set(row.usuario_id, row.saldo_apos);
  }

  const linhas: LinhaCredito[] = (membros ?? []).map((m) => ({
    usuarioId: m.usuario_id,
    nome: m.usuarios?.nome_completo || m.usuarios?.email || "—",
    saldo: saldoPorUsuario.get(m.usuario_id) ?? config?.creditos_mensais_padrao ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Motor de Conteúdo" title="Créditos" description="Modelo de cobrança e saldo de cada membro." />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
          <CardDescription>Trocar o modo de cobrança não exige alterar código.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigCreditosForm
            modoCredito={config?.modo_credito ?? "plataforma"}
            creditosMensaisPadrao={config?.creditos_mensais_padrao ?? 0}
            custoPorGeracao={config?.custo_por_geracao ?? 0}
            modeloIaConteudo={config?.modelo_ia_conteudo ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Créditos por membro</CardTitle>
          <CardDescription>Adicionar, zerar ou ajustar em massa.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <CreditosTable linhas={linhas} />
        </CardContent>
      </Card>
    </div>
  );
}
