import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RadarLista, PedidosAjudaLista } from "@/components/radar-equipe";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { carregarPedidos, carregarRadar } from "@/lib/radar/carregar";
import { SITE_URL } from "@/lib/site-config";
import { ConviteLink } from "./convite";

export default async function MembroEquipePage() {
  const user = await requireMembro();
  const supabase = await createClient();
  const { data: membro } = await supabase
    .from("membros")
    .select("codigo_convite")
    .eq("usuario_id", user.id)
    .single();

  // RLS/radar_equipe: só a própria linha descendente.
  const [linhas, pedidos] = await Promise.all([carregarRadar(user.id), carregarPedidos(user.id)]);
  const diretos = linhas.filter((l) => l.nivel === 1).length;
  const urlConvite = `${SITE_URL}/cadastro?ref=${membro?.codigo_convite ?? ""}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Liderança"
        title="Minha equipe"
        description="Convide pessoas para a plataforma e acompanhe quem está ativo na sua linha."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Seu link de convite</CardTitle>
          <CardDescription>
            Quem se cadastrar por este link entra na sua equipe (depois da aprovação do administrador).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConviteLink url={urlConvite} />
        </CardContent>
      </Card>

      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Você ainda não tem indicados aprovados na plataforma. Assim que alguém entrar pelo seu link e
          for aprovado, aparece aqui com o radar de atividade.
        </p>
      ) : (
        <>
          {pedidos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos de ajuda da sua equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <PedidosAjudaLista pedidos={pedidos} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Radar · {diretos} direto(s), {linhas.length} na linha
              </CardTitle>
              <CardDescription>
                Verde: atividade nos últimos 2 dias · Amarelo: 3 a 5 · Vermelho: mais de 5.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadarLista linhas={linhas} mostrarPatrocinador={linhas.length > diretos} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
