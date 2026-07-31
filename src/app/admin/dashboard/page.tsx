import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

async function getMetrics() {
  const supabase = await createClient();

  const [membrosAtivos, membrosPendentes, whatsappConectados] = await Promise.all([
    supabase.from("membros").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    supabase.from("membros").select("*", { count: "exact", head: true }).eq("status", "pendente"),
    supabase
      .from("whatsapp_sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "conectado"),
  ]);

  return {
    membrosAtivos: membrosAtivos.count ?? 0,
    membrosPendentes: membrosPendentes.count ?? 0,
    whatsappConectados: whatsappConectados.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const metrics = await getMetrics();

  const cards = [
    { label: "Membros ativos", value: metrics.membrosAtivos },
    { label: "Aguardando aprovação", value: metrics.membrosPendentes },
    { label: "WhatsApp conectados", value: metrics.whatsappConectados },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
