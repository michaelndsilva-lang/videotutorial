"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { YoutubePlayer } from "@/components/youtube-player";
import { extrairYoutubeId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { concluirAula, desmarcarAula } from "../actions";

export type AulaView = {
  id: string;
  titulo: string;
  descricao: string;
  videoUrl: string;
  feita: boolean;
};

export function CursoPlayer({
  cursoId,
  aulas,
  aulaAtualId,
}: {
  cursoId: string;
  aulas: AulaView[];
  aulaAtualId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const indice = Math.max(0, aulas.findIndex((a) => a.id === aulaAtualId));
  const aula = aulas[indice];
  const proxima = aulas[indice + 1];
  const videoId = extrairYoutubeId(aula.videoUrl);

  function marcar(feita: boolean, automatico = false) {
    startTransition(async () => {
      try {
        if (feita) await concluirAula(aula.id);
        else await desmarcarAula(aula.id);
        if (feita) toast.success(automatico ? "Aula concluída! ✅" : "Aula marcada como assistida.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        {videoId ? (
          <YoutubePlayer
            key={videoId}
            videoId={videoId}
            title={aula.titulo}
            onEnded={() => {
              if (!aula.feita) marcar(true, true);
            }}
          />
        ) : (
          <a
            href={aula.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            Abrir vídeo
          </a>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            Aula {indice + 1} de {aulas.length}
          </span>
          <h2 className="text-lg font-medium">{aula.titulo}</h2>
          {aula.descricao && (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{aula.descricao}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {aula.feita ? (
            <Button variant="outline" size="sm" disabled={isPending} onClick={() => marcar(false)}>
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              Assistida (desmarcar)
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={isPending} onClick={() => marcar(true)}>
              Marcar como assistida
            </Button>
          )}
          {proxima && (
            <Link
              href={`/membro/treinamentos/${cursoId}?aula=${proxima.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              Próxima aula
              <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <ol className="flex flex-col divide-y self-start rounded-xl border">
        {aulas.map((a, i) => (
          <li key={a.id}>
            <Link
              href={`/membro/treinamentos/${cursoId}?aula=${a.id}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                a.id === aula.id && "bg-muted font-medium"
              )}
              aria-current={a.id === aula.id ? "true" : undefined}
            >
              {a.feita ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {i + 1}. {a.titulo}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
