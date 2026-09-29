"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Film, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { SUNNE_BUCKET, SUNNE_PDF_MAX_BYTES, SUNNE_VIDEO_MAX_BYTES } from "@/lib/sunne/limites";
import { registrarMaterialSunne, removerMaterialSunne, salvarPromptsSunne } from "./sunne-actions";
import type { SunneMaterialTipo } from "@/lib/types/database.types";

export type MaterialSunne = {
  id: string;
  tipo: SunneMaterialTipo;
  titulo: string;
  descricao: string;
  tamanho_bytes: number;
  caracteres: number | null;
};

function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function nomeSemExtensao(nome: string) {
  return nome.replace(/\.[^.]+$/, "");
}

function PromptsSunne({ promptInicial, followupInicial }: { promptInicial: string; followupInicial: string }) {
  const [prompt, setPrompt] = useState(promptInicial);
  const [followup, setFollowup] = useState(followupInicial);
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await salvarPromptsSunne(prompt, followup);
        toast.success("Prompt do SUNNE salvo.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sunne-prompt">Prompt</Label>
        <Textarea
          id="sunne-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={14}
          placeholder="Descreva quem é o SUNNE, o que ele vende/apresenta, o tom da conversa e o objetivo com cada lead..."
          className="font-mono text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sunne-followup">Follow-up</Label>
        <p className="text-xs text-muted-foreground">
          Mensagem enviada automaticamente ao lead que parar de responder por 3 horas.
        </p>
        <Textarea
          id="sunne-followup"
          value={followup}
          onChange={(e) => setFollowup(e.target.value)}
          rows={5}
          placeholder="Escreva aqui a mensagem de follow-up para leads inativos..."
          className="font-mono text-sm"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSalvar} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function UploadMaterial({ membroId, tipo }: { membroId: string; tipo: SunneMaterialTipo }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const isPdf = tipo === "pdf";
  const limite = isPdf ? SUNNE_PDF_MAX_BYTES : SUNNE_VIDEO_MAX_BYTES;
  const mimeEsperado = isPdf ? "application/pdf" : "video/mp4";

  function handleArquivo(file: File | null) {
    if (!file) return;
    if (file.type !== mimeEsperado) {
      toast.error(isPdf ? "Selecione um arquivo PDF." : "Selecione um vídeo em MP4.");
      return;
    }
    if (file.size > limite) {
      toast.error(`Arquivo acima do limite de ${formatarTamanho(limite)}.`);
      return;
    }
    setArquivo(file);
    if (!titulo) setTitulo(nomeSemExtensao(file.name));
  }

  function limpar() {
    setArquivo(null);
    setTitulo("");
    setDescricao("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleEnviar() {
    if (!arquivo) return;
    if (!titulo.trim()) return toast.error("Informe um título.");
    if (!isPdf && !descricao.trim()) return toast.error("Diga quando o agente deve enviar este vídeo.");

    setEnviando(true);
    try {
      const supabase = createClient();
      const nomeSeguro = arquivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
      const storagePath = `${membroId}/${tipo}/${crypto.randomUUID()}-${nomeSeguro}`;

      const { error } = await supabase.storage
        .from(SUNNE_BUCKET)
        .upload(storagePath, arquivo, { contentType: mimeEsperado, upsert: false });
      if (error) throw new Error(`Falha no upload: ${error.message}`);

      await registrarMaterialSunne({
        tipo,
        titulo,
        descricao,
        storagePath,
        mimeType: mimeEsperado,
      });
      toast.success(isPdf ? "PDF adicionado. O SUNNE já está usando esse conteúdo." : "Vídeo adicionado.");
      limpar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
      <input
        ref={inputRef}
        type="file"
        accept={isPdf ? "application/pdf" : "video/mp4"}
        className="hidden"
        onChange={(e) => handleArquivo(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        className="w-fit"
      >
        <Upload className="size-4" />
        {arquivo ? "Trocar arquivo" : isPdf ? "Selecionar PDF" : "Selecionar vídeo (MP4)"}
      </Button>
      {arquivo ? (
        <>
          <p className="text-xs text-muted-foreground">
            {arquivo.name} · {formatarTamanho(arquivo.size)}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`titulo-${tipo}`}>Título</Label>
            <Input id={`titulo-${tipo}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`descricao-${tipo}`}>
              {isPdf ? "Observação (opcional)" : "Quando o agente deve enviar este vídeo?"}
            </Label>
            <Textarea
              id={`descricao-${tipo}`}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder={
                isPdf ? "Ex.: tabela de preços atualizada" : "Ex.: o lead perguntar como funciona o produto"
              }
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEnviar} disabled={enviando}>
              {enviando ? <Loader2 className="size-4 animate-spin" /> : null}
              {enviando ? "Enviando..." : "Adicionar"}
            </Button>
            <Button variant="ghost" onClick={limpar} disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {isPdf
            ? `PDF com texto selecionável, até ${formatarTamanho(limite)}.`
            : `Vídeo curto em MP4, até ${formatarTamanho(limite)}.`}
        </p>
      )}
    </div>
  );
}

function ListaMateriais({ materiais }: { materiais: MaterialSunne[] }) {
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemover(id: string) {
    setRemovendoId(id);
    startTransition(async () => {
      try {
        await removerMaterialSunne(id);
        toast.success("Removido.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
      } finally {
        setRemovendoId(null);
        setConfirmandoId(null);
      }
    });
  }

  if (materiais.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum arquivo adicionado ainda.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {materiais.map((m) => {
        const Icone = m.tipo === "pdf" ? FileText : Film;
        return (
          <li key={m.id} className="flex items-start gap-3 p-3">
            <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.titulo}</p>
              {m.descricao ? (
                <p className="text-xs text-muted-foreground">
                  {m.tipo === "video" ? `Enviar quando: ${m.descricao}` : m.descricao}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground/70">
                {formatarTamanho(m.tamanho_bytes)}
                {m.caracteres ? ` · ${m.caracteres.toLocaleString("pt-BR")} caracteres lidos` : ""}
              </p>
            </div>
            {confirmandoId === m.id ? (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemover(m.id)}
                  disabled={removendoId === m.id}
                >
                  {removendoId === m.id ? "Removendo..." : "Remover"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmandoId(null)} disabled={removendoId === m.id}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remover ${m.titulo}`}
                onClick={() => setConfirmandoId(m.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SunnePanel({
  membroId,
  promptInicial,
  followupInicial,
  materiais,
  ativo,
}: {
  membroId: string;
  promptInicial: string;
  followupInicial: string;
  materiais: MaterialSunne[];
  ativo: boolean;
}) {
  const pdfs = materiais.filter((m) => m.tipo === "pdf");
  const videos = materiais.filter((m) => m.tipo === "video");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Agente SUNNE</CardTitle>
            <Badge variant="secondary">Exclusivo</Badge>
            {ativo ? <Badge>Ativo</Badge> : null}
          </div>
          <CardDescription>
            Seu agente exclusivo. {ativo ? "" : "Selecione o modo SUNNE acima para ele passar a responder seus leads."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromptsSunne promptInicial={promptInicial} followupInicial={followupInicial} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Materiais de estudo (PDF)</CardTitle>
          <CardDescription>
            O SUNNE lê o texto destes PDFs e usa como base para responder as dúvidas dos leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListaMateriais materiais={pdfs} />
          <UploadMaterial membroId={membroId} tipo="pdf" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vídeos curtos</CardTitle>
          <CardDescription>
            O SUNNE envia o vídeo para o lead no WhatsApp quando a situação descrita acontecer na conversa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListaMateriais materiais={videos} />
          <UploadMaterial membroId={membroId} tipo="video" />
        </CardContent>
      </Card>
    </div>
  );
}
