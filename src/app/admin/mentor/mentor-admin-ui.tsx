"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import {
  alternarDocumentoAtivo,
  criarDocumentoTexto,
  editarDocumento,
  importarPdf,
  removerDocumento,
  reprocessarDocumento,
  salvarConfigMentor,
} from "./actions";

const PDF_MAX_BYTES = 50 * 1024 * 1024;

function useAcao() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  function executar<T>(acao: () => Promise<T>, sucesso?: (r: T) => string, depois?: () => void) {
    startTransition(async () => {
      try {
        const r = await acao();
        if (sucesso) toast.success(sucesso(r));
        depois?.();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
        router.refresh();
      }
    });
  }
  return { isPending, executar };
}

export function ConfigMentorForm({
  ativo: ativoInicial,
  limiteDiario,
  promptSistema,
}: {
  ativo: boolean;
  limiteDiario: number;
  promptSistema: string;
}) {
  const [ativo, setAtivo] = useState(ativoInicial);
  const [limite, setLimite] = useState(String(limiteDiario));
  const [prompt, setPrompt] = useState(promptSistema);
  const { isPending, executar } = useAcao();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        executar(
          () => salvarConfigMentor({ ativo, limiteDiario: Number(limite), promptSistema: prompt }),
          () => "Configuração do Mentor salva."
        );
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
        />
        Mentor ligado para os membros
      </label>
      <div className="flex flex-col gap-2">
        <Label htmlFor="limite-mentor">Perguntas por membro por dia</Label>
        <Input
          id="limite-mentor"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt-mentor">Instruções do Mentor (prompt de sistema)</Label>
        <Textarea
          id="prompt-mentor"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          maxLength={20000}
        />
        <p className="text-xs text-muted-foreground">
          Regras fixas que valem sempre, mesmo se você apagar daqui: nunca prometer renda, nunca
          alegar cura, nunca inventar preços ou condições e responder só sobre o negócio.
        </p>
      </div>
      <Button type="submit" className="w-fit" disabled={isPending}>
        Salvar
      </Button>
    </form>
  );
}

export function DocumentoTextoDialog({
  documento,
}: {
  documento?: { id: string; titulo: string; conteudo: string };
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(documento?.titulo ?? "");
  const [conteudo, setConteudo] = useState(documento?.conteudo ?? "");
  const { isPending, executar } = useAcao();

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && setOpen(v)}>
      <DialogTrigger render={<Button size="sm" variant={documento ? "outline" : "default"} />}>
        {documento ? "Editar" : "Adicionar texto"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{documento ? "Editar documento" : "Novo documento de texto"}</DialogTitle>
          <DialogDescription>
            Cole informações oficiais: regras, preços, perguntas frequentes, roteiros. Ao salvar, o
            Mentor reprocessa o conteúdo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo-doc">Título</Label>
            <Input
              id="titulo-doc"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="conteudo-doc">Conteúdo</Label>
            <Textarea
              id="conteudo-doc"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={14}
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {conteudo.length.toLocaleString("pt-BR")} caracteres
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || !titulo.trim() || !conteudo.trim()}
            onClick={() =>
              executar(
                () =>
                  documento
                    ? editarDocumento(documento.id, titulo, conteudo)
                    : criarDocumentoTexto(titulo, conteudo),
                (total) => `Documento processado em ${total} trecho(s).`,
                () => {
                  setOpen(false);
                  if (!documento) {
                    setTitulo("");
                    setConteudo("");
                  }
                }
              )
            }
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "Processando..." : "Salvar e processar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EnviarPdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function handleArquivo(file: File | null) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Selecione um arquivo PDF.");
    if (file.size > PDF_MAX_BYTES) return toast.error("PDF acima de 50 MB.");

    setEnviando(true);
    try {
      const supabase = createClient();
      const nomeSeguro = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
      const path = `pdf/${crypto.randomUUID()}-${nomeSeguro}`;
      const { error } = await supabase.storage
        .from("mentor")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw new Error(`Falha no upload: ${error.message}`);

      const total = await importarPdf({
        path,
        nomeArquivo: file.name,
        titulo: file.name.replace(/\.pdf$/i, ""),
      });
      toast.success(`PDF processado em ${total} trecho(s). O Mentor já pode usar.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o PDF.");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleArquivo(e.target.files?.[0] ?? null)}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
      >
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        {enviando ? "Processando PDF..." : "Enviar PDF"}
      </Button>
    </>
  );
}

export function DocumentoAcoes({
  id,
  titulo,
  ativo,
  status,
}: {
  id: string;
  titulo: string;
  ativo: boolean;
  status: string;
}) {
  const { isPending, executar } = useAcao();
  return (
    <>
      {status !== "pronto" && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            executar(() => reprocessarDocumento(id), (total) => `Processado em ${total} trecho(s).`)
          }
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Processar
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          executar(
            () => alternarDocumentoAtivo(id, !ativo),
            () => (ativo ? "O Mentor não usa mais esse documento." : "Documento ativado.")
          )
        }
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
              O Mentor deixa de usar esse conteúdo. Para só pausar, use Desativar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executar(() => removerDocumento(id), () => "Documento removido.")}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
