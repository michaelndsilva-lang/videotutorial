import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { GerarForm } from "./gerar-form";

export default async function GerarConteudoPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  const [{ data: perfil }, { data: config }, { data: ultimoLancamento }] = await Promise.all([
    supabase.from("perfil_conteudo").select("onboarding_completo").eq("usuario_id", user.id).maybeSingle(),
    supabase.from("configuracoes_gerais").select("modo_credito, creditos_mensais_padrao").limit(1).single(),
    supabase
      .from("creditos_extrato")
      .select("saldo_apos")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!perfil?.onboarding_completo) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Motor de Conteúdo" title="Gerar Conteúdo" />
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-sm text-muted-foreground">Complete seu perfil em 1 minuto e libere o motor.</p>
            <a href="/membro/conteudo/perfil" className={buttonVariants({})}>
              Completar perfil
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const saldoInicial =
    config?.modo_credito === "ilimitado"
      ? null
      : (ultimoLancamento?.saldo_apos ?? config?.creditos_mensais_padrao ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Motor de Conteúdo"
        title="Gerar Conteúdo"
        description="Escolha o objetivo e o formato — o motor cuida do resto."
      />
      <GerarForm saldoInicial={saldoInicial} />
    </div>
  );
}
