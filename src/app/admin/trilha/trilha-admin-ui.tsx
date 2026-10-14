"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TIPO_TAREFA_LABEL, TOTAL_DIAS } from "@/lib/trilha/progresso";
import { extrairYoutubeId } from "@/lib/youtube";
import {
  alternarMissaoAtiva,
  ativarTodasMissoes,
  moverMissao,
  removerMissao,
  salvarMissao,
} from "./actions";
import type { TipoTarefa } from "@/lib/types/database.types";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const DESCRICAO_TIPO: Record<TipoTarefa, string> = {
  assistir: "O membro confirma que assistiu.",
  executar: "O membro confirma que fez a ação.",
  responder: "O membro escreve uma resposta (você vê no progresso).",
};

function useAcao() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  function executar(acao: () => Promise<void>, sucesso?: string, depois?: () => void) {
    startTransition(async () => {
      try {
        await acao();
        if (sucesso) toast.success(sucesso);
        depois?.();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
      }
    });
  }
  return { isPending, executar };
}

export function MissaoDialog({
  missao,
  diaPadrao = 1,
}: {
  missao?: {
    id: string;
    dia: number;
    titulo: string;
    descricao: string;
    videoUrl: string | null;
    tipo: TipoTarefa;
    ativo: boolean;
  };
  diaPadrao?: number;
}) {
  const [open, setOpen] = useState(false);
  const [dia, setDia] = useState(missao?.dia ?? diaPadrao);
  const [titulo, setTitulo] = useState(missao?.titulo ?? "");
  const [descricao, setDescricao] = useState(missao?.descricao ?? "");
  const [videoUrl, setVideoUrl] = useState(missao?.videoUrl ?? "");
  const [tipo, setTipo] = useState<TipoTarefa>(missao?.tipo ?? "assistir");
  const [ativo, setAtivo] = useState(missao?.ativo ?? true);
  const { isPending, executar } = useAcao();
  const videoInvalido = videoUrl.trim() !== "" && !extrairYoutubeId(videoUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={missao ? "outline" : "default"} />}>
        {missao ? "Editar" : "Nova missão"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{missao ? "Editar missão" : "Nova missão"}</DialogTitle>
          <DialogDescription>
            Missões de um dia só liberam quando todas as do dia anterior estão concluídas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dia-missao">Dia</Label>
              <select
                id="dia-missao"
                className={selectClass}
                value={dia}
                onChange={(e) => setDia(Number(e.target.value))}
              >
                {Array.from({ length: TOTAL_DIAS }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Dia {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tipo-missao">Tarefa</Label>
              <select
                id="tipo-missao"
                className={selectClass}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoTarefa)}
              >
                {(Object.keys(TIPO_TAREFA_LABEL) as TipoTarefa[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_TAREFA_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{DESCRICAO_TIPO[tipo]}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo-missao">Título</Label>
            <Input
              id="titulo-missao"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao-missao">Instruções</Label>
            <Textarea
              id="descricao-missao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={2000}
              rows={4}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="video-missao">Vídeo do YouTube (opcional)</Label>
            <Input
              id="video-missao"
              type="url"
              inputMode="url"
              placeholder="https://youtu.be/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            {videoInvalido && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Não reconheci como link do YouTube: o membro verá só um link “Abrir vídeo”.
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Visível para os membros
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || !titulo.trim()}
            onClick={() =>
              executar(
                () =>
                  salvarMissao({ id: missao?.id, dia, titulo, descricao, videoUrl, tipo, ativo }),
                missao ? "Missão salva." : "Missão criada.",
                () => {
                  setOpen(false);
                  if (!missao) {
                    setTitulo("");
                    setDescricao("");
                    setVideoUrl("");
                  }
                }
              )
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MissaoAcoes({
  id,
  titulo,
  ativo,
  primeiro,
  ultimo,
}: {
  id: string;
  titulo: string;
  ativo: boolean;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const { isPending, executar } = useAcao();
  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para cima"
        disabled={isPending || primeiro}
        onClick={() => executar(() => moverMissao(id, "cima"))}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para baixo"
        disabled={isPending || ultimo}
        onClick={() => executar(() => moverMissao(id, "baixo"))}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => executar(() => alternarMissaoAtiva(id, !ativo))}
      >
        {ativo ? "Desativar" : "Ativar"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm" variant="destructive" disabled={isPending}>
              Remover
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Apaga a missão e o progresso/respostas dos membros nela. Para só esconder, use
              Desativar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => executar(() => removerMissao(id), "Missão removida.")}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AtivarTodasMissoes({ total }: { total: number }) {
  const { isPending, executar } = useAcao();
  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() => executar(() => ativarTodasMissoes(), `${total} missão(ões) ativadas.`)}
    >
      Ativar todas ({total})
    </Button>
  );
}
