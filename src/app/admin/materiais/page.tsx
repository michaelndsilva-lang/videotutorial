import { FileText, Image as ImageIcon, Presentation, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { MATERIAL_TIPO_LABEL, formatarTamanho } from "@/lib/materiais/config";
import { MaterialFormDialog } from "./material-form-dialog";
import { MaterialAcoes } from "./material-acoes";
import type { Material, MaterialTipo } from "@/lib/types/database.types";

const ICONE: Record<MaterialTipo, typeof FileText> = {
  pdf: FileText,
  apresentacao: Presentation,
  imagem: ImageIcon,
  video: Video,
};

export default async function AdminMateriaisPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("materiais")
    .select("*")
    .order("categoria")
    .order("ordem")
    .order("created_at");
  const materiais = (data ?? []) as Material[];

  const porCategoria = new Map<string, Material[]>();
  for (const m of materiais) {
    porCategoria.set(m.categoria, [...(porCategoria.get(m.categoria) ?? []), m]);
  }
  const categorias = Array.from(porCategoria.keys());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Conteúdo oficial"
        title="Materiais"
        description="Vídeos, catálogos, PDFs e apresentações que a equipe usa. Só você adiciona e edita."
        actions={<MaterialFormDialog modo="criar" categorias={categorias} />}
      />

      {materiais.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhum material ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Adicione o primeiro material. Ele aparece na hora para todos os membros aprovados, em
            Materiais.
          </CardContent>
        </Card>
      ) : (
        categorias.map((categoria) => {
          const itens = porCategoria.get(categoria) ?? [];
          return (
            <section key={categoria} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {categoria}
              </h2>
              <ul className="flex flex-col divide-y rounded-xl border">
                {itens.map((m, i) => {
                  const tipo = m.tipo as MaterialTipo;
                  const Icone = ICONE[tipo];
                  return (
                    <li
                      key={m.id}
                      className={`flex flex-col gap-3 p-4 ${m.ativo ? "" : "opacity-60"}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icone className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="font-medium">{m.titulo}</span>
                          {m.descricao && (
                            <span className="text-sm text-muted-foreground">{m.descricao}</span>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge variant="outline">{MATERIAL_TIPO_LABEL[tipo]}</Badge>
                            {!m.ativo && <Badge variant="secondary">Desativado</Badge>}
                            {m.video_url ? (
                              <span className="truncate">Link externo</span>
                            ) : m.tamanho_bytes ? (
                              <span>{formatarTamanho(m.tamanho_bytes)}</span>
                            ) : null}
                            <span>· {m.permitir_download ? "baixa" : "só visualiza"}</span>
                            <span>· {m.compartilhavel ? "compartilhável" : "uso interno"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <MaterialFormDialog modo="editar" categorias={categorias} material={m} />
                        <MaterialAcoes
                          id={m.id}
                          titulo={m.titulo}
                          ativo={m.ativo}
                          primeiro={i === 0}
                          ultimo={i === itens.length - 1}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
