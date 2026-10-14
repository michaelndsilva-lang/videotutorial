"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  MATERIAIS_BUCKET,
  MATERIAL_ACCEPT,
  MATERIAL_MAX_BYTES,
  MATERIAL_MIMES,
  MATERIAL_TIPOS,
  MATERIAL_TIPO_LABEL,
  caminhoMaterial,
  formatarTamanho,
} from "@/lib/materiais/config";
import { atualizarMaterial, criarMaterial, type ArquivoEnviado } from "./actions";
import type { Material, MaterialTipo } from "@/lib/types/database.types";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type Props =
  | { modo: "criar"; categorias: string[]; material?: undefined }
  | { modo: "editar"; categorias: string[]; material: Material };

export function MaterialFormDialog({ modo, categorias, material }: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<MaterialTipo>((material?.tipo as MaterialTipo) ?? "pdf");
  const [categoria, setCategoria] = useState(material?.categoria ?? "");
  const [titulo, setTitulo] = useState(material?.titulo ?? "");
  const [descricao, setDescricao] = useState(material?.descricao ?? "");
  const [videoUrl, setVideoUrl] = useState(material?.video_url ?? "");
  const [permitirDownload, setPermitirDownload] = useState(material?.permitir_download ?? true);
  const [compartilhavel, setCompartilhavel] = useState(material?.compartilhavel ?? true);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function escolherArquivo(file: File | null) {
    if (!file) return setArquivo(null);
    if (!MATERIAL_MIMES[tipo].includes(file.type)) {
      if (inputRef.current) inputRef.current.value = "";
      return toast.error(`Formato não aceito para ${MATERIAL_TIPO_LABEL[tipo]}.`);
    }
    if (file.size > MATERIAL_MAX_BYTES) {
      if (inputRef.current) inputRef.current.value = "";
      return toast.error(`Arquivo acima de ${formatarTamanho(MATERIAL_MAX_BYTES)}.`);
    }
    setArquivo(file);
  }

  function limparFormulario() {
    if (modo === "criar") {
      setTitulo("");
      setDescricao("");
      setVideoUrl("");
    }
    setArquivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function salvar() {
    setSalvando(true);
    let enviado: ArquivoEnviado | null = null;
    try {
      if (arquivo) {
        const supabase = createClient();
        const path = caminhoMaterial(tipo, arquivo.name);
        const { error } = await supabase.storage
          .from(MATERIAIS_BUCKET)
          .upload(path, arquivo, { contentType: arquivo.type, upsert: false });
        if (error) throw new Error(`Falha no upload: ${error.message}`);
        enviado = { path, nomeArquivo: arquivo.name };
      }

      const dados = {
        categoria,
        titulo,
        descricao,
        permitirDownload,
        compartilhavel,
        videoUrl: tipo === "video" ? videoUrl : null,
      };
      if (modo === "criar") {
        await criarMaterial({ ...dados, tipo }, enviado);
        toast.success("Material adicionado. Os membros já podem ver.");
      } else {
        await atualizarMaterial(material.id, dados, enviado);
        toast.success("Material atualizado.");
      }
      limparFormulario();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const temArquivoAtual = modo === "editar" && !!material.arquivo_path;
  const precisaArquivo = tipo !== "video" && modo === "criar";
  const podeSalvar =
    !salvando &&
    categoria.trim() &&
    titulo.trim() &&
    (!precisaArquivo || arquivo) &&
    (tipo !== "video" || arquivo || videoUrl.trim() || temArquivoAtual);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (salvando) return;
        setOpen(v);
        if (!v) limparFormulario();
      }}
    >
      <DialogTrigger
        render={<Button size="sm" variant={modo === "criar" ? "default" : "outline"} />}
      >
        {modo === "criar" ? "Adicionar material" : "Editar"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modo === "criar" ? "Novo material" : "Editar material"}</DialogTitle>
          <DialogDescription>
            Só você adiciona materiais. Os membros aprovados veem, baixam e compartilham.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {modo === "criar" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className={selectClass}
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as MaterialTipo);
                  setArquivo(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                {MATERIAL_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {MATERIAL_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tipo: {MATERIAL_TIPO_LABEL[tipo]}</p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              list="categorias-materiais"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              maxLength={60}
              placeholder="Ex.: Catálogos, Apresentações, Treinamentos"
            />
            <datalist id="categorias-materiais">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>

          {tipo === "video" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="video-url">Link do vídeo (YouTube, Drive…)</Label>
              <Input
                id="video-url"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={!!arquivo}
              />
              <p className="text-xs text-muted-foreground">
                Ou envie um arquivo MP4 de até {formatarTamanho(MATERIAL_MAX_BYTES)} abaixo.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Arquivo</Label>
            {temArquivoAtual && !arquivo && (
              <p className="truncate text-xs text-muted-foreground">
                Atual: {material.nome_arquivo}
                {material.tamanho_bytes ? ` (${formatarTamanho(material.tamanho_bytes)})` : ""}
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={MATERIAL_ACCEPT[tipo]}
              className="hidden"
              onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => inputRef.current?.click()}
              disabled={salvando}
            >
              <Upload className="size-4" />
              {arquivo
                ? "Trocar arquivo escolhido"
                : temArquivoAtual
                  ? "Substituir arquivo"
                  : "Escolher arquivo"}
            </Button>
            {arquivo && (
              <p className="truncate text-xs text-muted-foreground">
                {arquivo.name} ({formatarTamanho(arquivo.size)})
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={permitirDownload}
                onChange={(e) => setPermitirDownload(e.target.checked)}
              />
              <span>Membros podem baixar</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={compartilhavel}
                onChange={(e) => setCompartilhavel(e.target.checked)}
              />
              <span>
                Membros podem compartilhar com leads
                <span className="block text-xs text-muted-foreground">
                  Gera um link público para enviar no WhatsApp. Desmarque em treinamentos internos.
                </span>
              </span>
            </label>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!podeSalvar}>
            {salvando && <Loader2 className="size-4 animate-spin" />}
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
