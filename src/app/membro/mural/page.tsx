import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { AgendaLista, AvisosLista, ConquistasMural } from "@/components/mural";
import { requireMembro } from "@/lib/auth/guards";
import { carregarAvisos, carregarConquistas, carregarEventos } from "@/lib/mural/carregar";

export default async function MembroMuralPage() {
  const user = await requireMembro();
  const [avisos, eventos, conquistas] = await Promise.all([
    carregarAvisos(),
    carregarEventos(user.id),
    carregarConquistas(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Equipe"
        title="Mural"
        description="Avisos da liderança, agenda de eventos e lives, e as conquistas da equipe."
      />
      {avisos.length > 0 && <AvisosLista avisos={avisos} />}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <AgendaLista eventos={eventos} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conquistas da equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <ConquistasMural conquistas={conquistas} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
