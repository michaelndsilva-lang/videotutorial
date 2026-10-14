"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, Circle, Lock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { YoutubeFacade } from "@/components/youtube-facade";
import { extrairYoutubeId } from "@/lib/youtube";
import { TIPO_TAREFA_LABEL, montarTrilha } from "@/lib/trilha/progresso";
import { cn } from "@/lib/utils";
import { concluirMissao, desmarcarMissao } from "./actions";
import type { TipoTarefa } from "@/lib/types/database.types";

export type MissaoView = {
  id: string;
  dia: number;
  ordem: number;
  titulo: string;
  descricao: string;
  videoUrl: string | null;
  tipo: TipoTarefa;
};

const BOTAO_CONCLUIR: Record<TipoTarefa, string> = {
  assistir: "Já assisti",
  executar: "Feito!",
  responder: "Enviar resposta",
};

function MissaoCard({
  missao,
  feita,
  resposta,
  bloqueada,
}: {
  missao: MissaoView;
  feita: boolean;
  resposta: string | null;
  bloqueada: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const videoId = extrairYoutubeId(missao.videoUrl);

  function executar(acao: () => Promise<void>, sucesso?: string) {
    startTransition(async () => {
      try {
        await acao();
        if (sucesso) toast.success(sucesso);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
      }
    });
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        feita && "border-emerald-500/40 bg-emerald-500/5"
      )}
    >
      <div className="flex items-start gap-2">
        {feita ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">{missao.titulo}</span>
          <span className="text-xs text-muted-foreground">{TIPO_TAREFA_LABEL[missao.tipo]}</span>
        </div>
      </div>

      {missao.descricao && (
        <p className="text-sm whitespace-pre-wrap text-foreground/90">{missao.descricao}</p>
      )}

      {videoId ? (
        <YoutubeFacade videoId={videoId} title={missao.titulo} className="rounded-xl shadow-none" />
      ) : missao.videoUrl ? (
        <a
          href={missao.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline underline-offset-2"
        >
          Abrir vídeo
        </a>
      ) : null}

      {feita ? (
        <div className="flex flex-col gap-2">
          {resposta && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{resposta}</p>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="w-fit text-muted-foreground"
            disabled={isPending}
            onClick={() => executar(() => desmarcarMissao(missao.id))}
          >
            <Undo2 className="size-4" />
            Desmarcar
          </Button>
        </div>
      ) : bloqueada ? null : (
        <div className="flex flex-col gap-2">
          {missao.tipo === "responder" && (
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva sua resposta"
              maxLength={2000}
              rows={3}
            />
          )}
          <Button
            size="sm"
            className="w-fit"
            disabled={isPending || (missao.tipo === "responder" && !texto.trim())}
            onClick={() => executar(() => concluirMissao(missao.id, texto), "Missão concluída! 🎉")}
          >
            {BOTAO_CONCLUIR[missao.tipo]}
          </Button>
        </div>
      )}
    </li>
  );
}

export function TrilhaView({
  missoes,
  respostas,
}: {
  missoes: MissaoView[];
  respostas: Record<string, string | null>;
}) {
  const concluidas = new Set(Object.keys(respostas));
  const trilha = montarTrilha(missoes, concluidas);
  const [aberto, setAberto] = useState<number | null>(trilha.diaAtual);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl border p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">
            {trilha.concluida ? "Trilha concluída! 🏆" : `Dia ${trilha.diaAtual} de 7`}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {trilha.feitas}/{trilha.total} missões · {trilha.percentual}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={trilha.percentual} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${trilha.percentual}%` }} />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {trilha.dias
          .filter((d) => d.missoes.length > 0)
          .map((d) => {
            const expandido = aberto === d.dia;
            return (
              <li key={d.dia} className="rounded-xl border">
                <button
                  type="button"
                  onClick={() => setAberto(expandido ? null : d.dia)}
                  aria-expanded={expandido}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      d.completo
                        ? "bg-emerald-500 text-white"
                        : d.liberado
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {d.liberado ? d.dia : <Lock className="size-4" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">Dia {d.dia}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.liberado
                        ? `${d.concluidas}/${d.missoes.length} concluídas`
                        : "Conclua o dia anterior para liberar"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn("size-4 shrink-0 transition-transform", expandido && "rotate-180")}
                  />
                </button>
                {expandido && (
                  <ul className="flex flex-col gap-3 px-4 pb-4">
                    {d.missoes.map((m) => (
                      <MissaoCard
                        key={m.id}
                        missao={m}
                        feita={concluidas.has(m.id)}
                        resposta={respostas[m.id] ?? null}
                        bloqueada={!d.liberado}
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
      </ol>
    </div>
  );
}
