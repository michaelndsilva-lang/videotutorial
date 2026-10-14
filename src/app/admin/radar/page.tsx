import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RadarLista, PedidosAjudaLista } from "@/components/radar-equipe";
import { requireAdmin } from "@/lib/auth/guards";
import { carregarPedidos, carregarRadar } from "@/lib/radar/carregar";

export default async function AdminRadarPage() {
  await requireAdmin();
  const [linhas, pedidos] = await Promise.all([carregarRadar(), carregarPedidos()]);
  const abertos = pedidos.filter((p) => p.status !== "resolvido").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Liderança"
        title="Radar da equipe"
        description="Quem está ativo, quem está esfriando e quem parou. Verde: atividade nos últimos 2 dias · Amarelo: 3 a 5 · Vermelho: mais de 5."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos de ajuda {abertos > 0 ? `(${abertos} em aberto)` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <PedidosAjudaLista pedidos={pedidos} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros aprovados</CardTitle>
        </CardHeader>
        <CardContent>
          <RadarLista linhas={linhas} mostrarPatrocinador />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Atividade = acesso à plataforma, leads criados ou movidos no Kanban, conteúdo gerado, perguntas ao
        Mentor e aulas assistidas. Leads criados pelo robô não contam. Todo dia de manhã você recebe no
        WhatsApp quem entrou no vermelho.
      </p>
    </div>
  );
}
