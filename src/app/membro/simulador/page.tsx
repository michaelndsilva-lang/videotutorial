import { PageHeader } from "@/components/page-header";
import { SimuladorEnergia } from "@/components/simulador-energia";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { carregarConfigSimulador } from "@/lib/energia/proposta";
import { SITE_URL } from "@/lib/site-config";
import { LinkSimuladorPublico } from "./link-publico";

export default async function MembroSimuladorPage() {
  const user = await requireMembro();
  const supabase = await createClient();
  const [config, { data: pagina }] = await Promise.all([
    carregarConfigSimulador(),
    supabase.from("paginas").select("slug, publicada, mostrar_energia").eq("membro_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Energia por assinatura"
        title="Simulador de economia"
        description="Simule com o cliente e gere a proposta em PDF com seu nome e WhatsApp."
      />
      <div className="max-w-xl">
        <SimuladorEnergia config={config} propostaUrl="/membro/simulador/proposta" pedirNomeCliente />
      </div>
      {pagina?.publicada && pagina.mostrar_energia && (
        <LinkSimuladorPublico url={`${SITE_URL}/c/${pagina.slug}/energia`} />
      )}
    </div>
  );
}
