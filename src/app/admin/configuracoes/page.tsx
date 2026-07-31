import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ContaForm } from "./conta-form";

export default async function AdminConfiguracoesPage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome_completo, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Administração" title="Configurações" description="Sua conta." />

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
    </div>
  );
}
