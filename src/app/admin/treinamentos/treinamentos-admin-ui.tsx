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
import { extrairYoutubeId } from "@/lib/youtube";
import {
  alternarAulaAtiva,
  alternarCursoAtivo,
  moverAula,
  moverCurso,
  removerAula,
  removerCurso,
  salvarAula,
  salvarCurso,
} from "./actions";

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

export function CursoDialog({
  categorias,
  curso,
}: {
  categorias: string[];
  curso?: { id: string; categoria: string; titulo: string; descricao: string; ativo: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState(curso?.categoria ?? "");
  const [titulo, setTitulo] = useState(curso?.titulo ?? "");
  const [descricao, setDescricao] = useState(curso?.descricao ?? "");
  const [ativo, setAtivo] = useState(curso?.ativo ?? false);
  const { isPending, executar } = useAcao();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={curso ? "outline" : "default"} />}>
        {curso ? "Editar curso" : "Novo curso"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{curso ? "Editar curso" : "Novo curso"}</DialogTitle>
          <DialogDescription>
            {curso
              ? "As aulas são editadas na lista do curso."
              : "Crie o curso desativado, adicione as aulas e ative quando estiver pronto."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-curso">Categoria</Label>
            <Input
              id="categoria-curso"
              list="categorias-cursos"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              maxLength={60}
              placeholder="Ex.: Primeiros passos, Vendas, Liderança"
            />
            <datalist id="categorias-cursos">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo-curso">Título</Label>
            <Input
              id="titulo-curso"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao-curso">Descrição (opcional)</Label>
            <Textarea
              id="descricao-curso"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Publicado para os membros
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || !categoria.trim() || !titulo.trim()}
            onClick={() =>
              executar(
                () => salvarCurso({ id: curso?.id, categoria, titulo, descricao, ativo }),
                curso ? "Curso salvo." : "Curso criado.",
                () => {
                  setOpen(false);
                  if (!curso) {
                    setTitulo("");
                    setDescricao("");
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

export function AulaDialog({
  cursoId,
  aula,
}: {
  cursoId: string;
  aula?: { id: string; titulo: string; descricao: string; videoUrl: string; ativo: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(aula?.titulo ?? "");
  const [descricao, setDescricao] = useState(aula?.descricao ?? "");
  const [videoUrl, setVideoUrl] = useState(aula?.videoUrl ?? "");
  const [ativo, setAtivo] = useState(aula?.ativo ?? true);
  const { isPending, executar } = useAcao();
  const videoId = extrairYoutubeId(videoUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={aula ? "outline" : "secondary"} />}>
        {aula ? "Editar" : "Nova aula"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aula ? "Editar aula" : "Nova aula"}</DialogTitle>
          <DialogDescription>
            Suba o vídeo no YouTube como “Não listado” e cole o link aqui.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="video-aula">Link do YouTube</Label>
            <Input
              id="video-aula"
              type="url"
              inputMode="url"
              placeholder="https://youtu.be/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            {videoId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt="Capa do vídeo"
                className="w-40 rounded-md border"
              />
            ) : (
              videoUrl.trim() && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Não reconheci como link do YouTube.
                </p>
              )
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo-aula">Título</Label>
            <Input
              id="titulo-aula"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao-aula">Descrição (opcional)</Label>
            <Textarea
              id="descricao-aula"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Visível no curso
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || !titulo.trim() || !videoId}
            onClick={() =>
              executar(
                () => salvarAula({ id: aula?.id, cursoId, titulo, descricao, videoUrl, ativo }),
                aula ? "Aula salva." : "Aula adicionada.",
                () => {
                  setOpen(false);
                  if (!aula) {
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

export function ItemAcoes({
  tipo,
  id,
  titulo,
  ativo,
  primeiro,
  ultimo,
}: {
  tipo: "curso" | "aula";
  id: string;
  titulo: string;
  ativo: boolean;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const { isPending, executar } = useAcao();
  const mover = tipo === "curso" ? moverCurso : moverAula;
  const alternar = tipo === "curso" ? alternarCursoAtivo : alternarAulaAtiva;
  const remover = tipo === "curso" ? removerCurso : removerAula;

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para cima"
        disabled={isPending || primeiro}
        onClick={() => executar(() => mover(id, "cima"))}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para baixo"
        disabled={isPending || ultimo}
        onClick={() => executar(() => mover(id, "baixo"))}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => executar(() => alternar(id, !ativo))}
      >
        {ativo ? (tipo === "curso" ? "Despublicar" : "Esconder") : tipo === "curso" ? "Publicar" : "Mostrar"}
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
              {tipo === "curso"
                ? "Apaga o curso, todas as aulas e o progresso dos membros nele."
                : "Apaga a aula e o progresso dos membros nela."}{" "}
              Para só esconder, use {tipo === "curso" ? "Despublicar" : "Esconder"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                executar(() => remover(id), tipo === "curso" ? "Curso removido." : "Aula removida.")
              }
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
