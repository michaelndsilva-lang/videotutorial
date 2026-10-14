import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ContaForm } from "./conta-form";
import { EnergiaConfigForm } from "./energia-form";

export default async function AdminConfiguracoesPage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  const [{ data: usuario }, { data: energia }] = await Promise.all([
    supabase.from("usuarios").select("nome_completo, email").eq("id", user.id).single(),
    supabase.from("energia_config").select("*").eq("id", 1).single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administração" title="Configurações" description="Sua conta e parâmetros da plataforma." />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Sua conta</CardTitle>
          <CardDescription>Nome de exibição e senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContaForm
            nomeCompleto={usuario?.nome_completo ?? ""}
            email={usuario?.email ?? user.email ?? ""}
          />
        </CardContent>
      </Card>

      {energia && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Simulador de energia</CardTitle>
            <CardDescription>
              Economia estimada = conta × fatia do consumo × desconto. Vale para o simulador
              público, o interno e a proposta em PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnergiaConfigForm
              inicial={{
                descontoPercentual: Number(energia.desconto_percentual),
                fatiaConsumoPercentual: Number(energia.fatia_consumo_percentual),
                contaMinima: Number(energia.conta_minima),
                ufsAtendidas: energia.ufs_atendidas,
                aviso: energia.aviso,
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
