"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { salvarTemplate, restaurarVersao } from "./actions";
import { OBJETIVO_LABEL, FORMATO_LABEL } from "@/lib/content/labels";
import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

type TemplateRow = {
  id: string;
  objetivo: ObjetivoConteudo;
  formato: FormatoConteudo;
  system_prompt: string;
  ativo: boolean;
  versao: number;
  updated_at: string;
};

const OBJETIVOS = Object.keys(OBJETIVO_LABEL) as ObjetivoConteudo[];
const FORMATOS = Object.keys(FORMATO_LABEL) as FormatoConteudo[];

function ComboEditor({ objetivo, formato, versoes }: { objetivo: ObjetivoConteudo; formato: FormatoConteudo; versoes: TemplateRow[] }) {
  const ativa = versoes.find((v) => v.ativo) ?? versoes[0];
  const [prompt, setPrompt] = useState(ativa?.system_prompt ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await salvarTemplate(objetivo, formato, prompt);
        toast.success("Template salvo como nova versão.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  function handleRestaurar(templateId: string) {
    startTransition(async () => {
      try {
        await restaurarVersao(templateId, objetivo, formato);
        toast.success("Versão restaurada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível restaurar.");
      }
    });
  }

  const historico = versoes.filter((v) => v.id !== ativa?.id);

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={14}
        className="font-mono text-sm"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Versão ativa: v{ativa?.versao ?? "—"} · atualizado em{" "}
          {ativa ? new Date(ativa.updated_at).toLocaleString("pt-BR") : "—"}
        </p>
        <Button onClick={handleSalvar} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar como nova versão"}
        </Button>
      </div>

      {historico.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <History className="size-3.5" /> Histórico de versões
          </p>
          {historico.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                v{v.versao} · {new Date(v.updated_at).toLocaleString("pt-BR")}
              </span>
              <Button variant="outline" size="xs" onClick={() => handleRestaurar(v.id)} disabled={isPending}>
                Restaurar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplatesEditor({ templates }: { templates: TemplateRow[] }) {
  const porCombo = useMemo(() => {
    const mapa = new Map<string, TemplateRow[]>();
    for (const t of templates) {
      const chave = `${t.objetivo}:${t.formato}`;
      const lista = mapa.get(chave) ?? [];
      lista.push(t);
      mapa.set(chave, lista);
    }
    return mapa;
  }, [templates]);

  return (
    <Tabs defaultValue={OBJETIVOS[0]}>
      <TabsList>
        {OBJETIVOS.map((o) => (
          <TabsTrigger key={o} value={o}>
            {OBJETIVO_LABEL[o]}
          </TabsTrigger>
        ))}
      </TabsList>
      {OBJETIVOS.map((objetivo) => (
        <TabsContent key={objetivo} value={objetivo}>
          <Tabs defaultValue={FORMATOS[0]}>
            <TabsList>
              {FORMATOS.map((f) => {
                const versoes = porCombo.get(`${objetivo}:${f}`) ?? [];
                return (
                  <TabsTrigger key={f} value={f}>
                    {FORMATO_LABEL[f]}
                    {versoes.length > 1 && (
                      <Badge variant="secondary" className="ml-1.5 text-[0.6rem]">
                        {versoes.length}v
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {FORMATOS.map((formato) => {
              const versoes = porCombo.get(`${objetivo}:${formato}`) ?? [];
              const ativa = versoes.find((v) => v.ativo) ?? versoes[0];
              return (
                <TabsContent key={formato} value={formato}>
                  {/* key na versão ativa: salvar/restaurar troca qual linha
                      está ativa (revalidatePath busca dado novo do servidor),
                      mas o useState do textarea só lê a prop inicial — sem
                      isso a tela fica mostrando o texto antigo até um reload
                      manual, mesmo com o banco já correto. Confirmado em
                      teste real: restaurar v1 salvava certo no servidor, mas
                      o textarea continuava mostrando o texto da v2. */}
                  <ComboEditor key={ativa?.id ?? formato} objetivo={objetivo} formato={formato} versoes={versoes} />
                </TabsContent>
              );
            })}
          </Tabs>
        </TabsContent>
      ))}
    </Tabs>
  );
}
