import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIA_AJUDA, STATUS_AJUDA } from "@/lib/radar/radar";
import { AjudaForm } from "./ajuda-form";

export default async function MembroAjudaPage() {
  const user = await requireMembro();
  const supabase = await createClient();
  const [{ data: pedidos }, { data: membro }] = await Promise.all([
    supabase
      .from("pedidos_ajuda")
      .select("id, categoria, mensagem, status, resposta, created_at")
      .eq("membro_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("membros").select("patrocinador_id").eq("usuario_id", user.id).single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Suporte"
        title="Preciso de ajuda"
        description="Travou em alguma coisa? Conte aqui: seu líder e o administrador recebem no WhatsApp."
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <AjudaForm temPatrocinador={!!membro?.patrocinador_id} />
        </CardContent>
      </Card>
      {(pedidos ?? []).length > 0 && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Seus pedidos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="flex flex-col divide-y border-t">
              {(pedidos ?? []).map((p) => (
                <li key={p.id} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={p.status === "resolvido" ? "default" : p.status === "em_atendimento" ? "secondary" : "outline"}>
                      {STATUS_AJUDA[p.status]}
                    </Badge>
                    <span>{CATEGORIA_AJUDA[p.categoria]}</span>
                    <span>· {new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{p.mensagem}</p>
                  {p.resposta && (
                    <p className="rounded-lg bg-muted/50 p-2 whitespace-pre-wrap">
                      <span className="font-medium">Resposta: </span>
                      {p.resposta}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
