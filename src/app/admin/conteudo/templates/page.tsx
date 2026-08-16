import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { TemplatesEditor } from "./templates-editor";

export default async function AdminConteudoTemplatesPage() {
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("conteudo_prompt_templates")
    .select("id, objetivo, formato, system_prompt, ativo, versao, updated_at")
    .order("objetivo")
    .order("formato")
    .order("versao", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Motor de Conteúdo"
        title="Templates de Prompt"
        description="16 combinações (4 objetivos × 4 formatos). Salvar cria uma nova versão; o histórico fica disponível pra restaurar."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editor</CardTitle>
          <CardDescription>O que o motor usa pra gerar conteúdo — cada membro entra aqui com os próprios dados de perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <TemplatesEditor templates={templates ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
