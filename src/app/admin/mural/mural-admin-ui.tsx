"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { moderarConquista, removerAviso, removerEvento, salvarAviso, salvarEvento } from "./actions";

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

function Remover({ titulo, onConfirm, disabled }: { titulo: string; onConfirm: () => void; disabled?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive" disabled={disabled}>Remover</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover “{titulo}”?</AlertDialogTitle>
          <AlertDialogDescription>Não pode ser desfeito.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AvisoDialog({
  aviso,
}: {
  aviso?: { id: string; titulo: string; texto: string; fixado: boolean; ativo: boolean; expiraEm: string };
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(aviso?.titulo ?? "");
  const [texto, setTexto] = useState(aviso?.texto ?? "");
  const [fixado, setFixado] = useState(aviso?.fixado ?? true);
  const [ativo, setAtivo] = useState(aviso?.ativo ?? true);
  const [expiraEm, setExpiraEm] = useState(aviso?.expiraEm ?? "");
  const { isPending, executar } = useAcao();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={aviso ? "outline" : "default"} />}>
        {aviso ? "Editar" : "Novo aviso"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aviso ? "Editar aviso" : "Novo aviso"}</DialogTitle>
          <DialogDescription>Avisos fixados aparecem no topo do Início de todos os membros.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo-aviso">Título</Label>
            <Input id="titulo-aviso" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="texto-aviso">Texto</Label>
            <Textarea id="texto-aviso" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expira-aviso">Sai do ar em (opcional, horário de Brasília)</Label>
            <Input id="expira-aviso" type="datetime-local" value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} className="w-60" />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-primary" checked={fixado} onChange={(e) => setFixado(e.target.checked)} />
              Fixar no topo do Início
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-primary" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Visível
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
          <Button
            disabled={isPending || !titulo.trim()}
            onClick={() =>
              executar(
                () => salvarAviso({ id: aviso?.id, titulo, texto, fixado, ativo, expiraEm }),
                aviso ? "Aviso salvo." : "Aviso publicado.",
                () => {
                  setOpen(false);
                  if (!aviso) {
                    setTitulo("");
                    setTexto("");
                    setExpiraEm("");
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

export function EventoDialog({
  evento,
}: {
  evento?: { id: string; titulo: string; descricao: string; inicio: string; duracaoMin: number; link: string; ativo: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [descricao, setDescricao] = useState(evento?.descricao ?? "");
  const [inicio, setInicio] = useState(evento?.inicio ?? "");
  const [duracao, setDuracao] = useState(String(evento?.duracaoMin ?? 60));
  const [link, setLink] = useState(evento?.link ?? "");
  const [ativo, setAtivo] = useState(evento?.ativo ?? true);
  const { isPending, executar } = useAcao();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={evento ? "outline" : "default"} />}>
        {evento ? "Editar" : "Novo evento"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{evento ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>
            Quem clicar em “Quero ser lembrado” recebe um WhatsApp 1 hora antes, com o link.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo-evento">Título</Label>
            <Input id="titulo-evento" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inicio-evento">Início (horário de Brasília)</Label>
              <Input id="inicio-evento" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="duracao-evento">Duração (min)</Label>
              <Input id="duracao-evento" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-evento">Link (Meet, Zoom, YouTube…)</Label>
            <Input id="link-evento" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="desc-evento">Descrição (opcional)</Label>
            <Textarea id="desc-evento" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={2000} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Visível na agenda
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
          <Button
            disabled={isPending || !titulo.trim() || !inicio}
            onClick={() =>
              executar(
                () =>
                  salvarEvento({ id: evento?.id, titulo, descricao, inicio, duracaoMin: Number(duracao), link, ativo }),
                evento ? "Evento salvo." : "Evento criado.",
                () => {
                  setOpen(false);
                  if (!evento) {
                    setTitulo("");
                    setDescricao("");
                    setInicio("");
                    setLink("");
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

export function RemoverAviso({ id, titulo }: { id: string; titulo: string }) {
  const { isPending, executar } = useAcao();
  return <Remover titulo={titulo} disabled={isPending} onConfirm={() => executar(() => removerAviso(id), "Aviso removido.")} />;
}

export function RemoverEvento({ id, titulo }: { id: string; titulo: string }) {
  const { isPending, executar } = useAcao();
  return <Remover titulo={titulo} disabled={isPending} onConfirm={() => executar(() => removerEvento(id), "Evento removido.")} />;
}

export function ModerarConquista({ id, oculta }: { id: string; oculta: boolean }) {
  const { isPending, executar } = useAcao();
  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => executar(() => moderarConquista(id, oculta ? "mostrar" : "ocultar"))}>
        {oculta ? "Mostrar" : "Ocultar"}
      </Button>
      <Remover titulo="esta conquista" disabled={isPending} onConfirm={() => executar(() => moderarConquista(id, "remover"), "Conquista removida.")} />
    </div>
  );
}
