import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AgentesForm } from "./agentes-form";

export default async function AdminAgentesPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("agentes_config")
    .select("modo, prompt_sistema, prompt_followup, updated_at")
    .order("modo");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agentes de IA</h1>
        <p className="text-sm text-muted-foreground">
          Esses prompts são compartilhados por todos os membros que usarem cada modo.
        </p>
      </div>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Prompts mestre</CardTitle>
        </CardHeader>
        <CardContent>
          <AgentesForm rows={rows ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
