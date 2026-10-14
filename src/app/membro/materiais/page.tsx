import { Download, ExternalLink, FileText, Image as ImageIcon, Presentation, Share2, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-config";
import { MATERIAL_TIPO_LABEL, formatarTamanho } from "@/lib/materiais/config";
import type { MaterialTipo } from "@/lib/types/database.types";

const ICONE: Record<MaterialTipo, typeof FileText> = {
  pdf: FileText,
  apresentacao: Presentation,
  imagem: ImageIcon,
  video: Video,
};

export default async function MembroMateriaisPage() {
  await requireMembro();
  const supabase = await createClient();

  // RLS já devolve só materiais ativos, e só para membro aprovado.
  const { data } = await supabase
    .from("materiais")
    .select("id, categoria, titulo, descricao, tipo, video_url, tamanho_bytes, permitir_download, compartilhavel, arquivo_path")
    .order("categoria")
    .order("ordem")
    .order("created_at");
  const materiais = data ?? [];

  const porCategoria = new Map<string, typeof materiais>();
  for (const m of materiais) {
    porCategoria.set(m.categoria, [...(porCategoria.get(m.categoria) ?? []), m]);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Material oficial"
        title="Materiais"
        description="Catálogos, apresentações e vídeos da equipe. Abra, baixe ou mande para seus contatos."
      />

      {materiais.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nenhum material por enquanto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assim que o administrador adicionar materiais, eles aparecem aqui.
          </CardContent>
        </Card>
      ) : (
        Array.from(porCategoria.entries()).map(([categoria, itens]) => (
          <section key={categoria} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {categoria}
            </h2>
            <ul className="flex flex-col divide-y rounded-xl border">
              {itens.map((m) => {
                const tipo = m.tipo as MaterialTipo;
                const Icone = ICONE[tipo];
                const abrir = `/membro/materiais/${m.id}/abrir`;
                const textoWhats = `*${m.titulo}*\n${SITE_URL}/m/${m.id}`;
                return (
                  <li key={m.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <Icone className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-medium">{m.titulo}</span>
                        {m.descricao && (
                          <span className="text-sm text-muted-foreground">{m.descricao}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {MATERIAL_TIPO_LABEL[tipo]}
                          {m.tamanho_bytes ? ` · ${formatarTamanho(m.tamanho_bytes)}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={abrir}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        <ExternalLink className="size-4" />
                        {tipo === "video" ? "Assistir" : "Abrir"}
                      </a>
                      {m.permitir_download && m.arquivo_path && (
                        <a
                          href={`${abrir}?download=1`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          <Download className="size-4" />
                          Baixar
                        </a>
                      )}
                      {m.compartilhavel && (
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(textoWhats)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ size: "sm" })}
                        >
                          <Share2 className="size-4" />
                          Enviar no WhatsApp
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
