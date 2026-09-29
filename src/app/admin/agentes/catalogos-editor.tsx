"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  CATALOGOS,
  CATALOGOS_BUCKET,
  CATALOGO_PDF_MAX_BYTES,
  CATALOGO_TIPOS,
} from "@/lib/recrutamento/catalogos";
import { registrarCatalogo, removerCatalogo } from "./actions";
import type { CatalogoTipo } from "@/lib/types/database.types";

export type CatalogoRow = {
  tipo: CatalogoTipo;
  nome_arquivo: string;
  tamanho_bytes: number;
  updated_at: string;
};

function formatarTamanho(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function SlotCatalogo({ tipo, atual }: { tipo: CatalogoTipo; atual: CatalogoRow | undefined }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [removendo, startRemover] = useTransition();
  const { nome, quando } = CATALOGOS[tipo];

  async function handleArquivo(file: File | null) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Selecione um arquivo PDF.");
    if (file.size > CATALOGO_PDF_MAX_BYTES) {
      return toast.error(`Arquivo acima do limite de ${formatarTamanho(CATALOGO_PDF_MAX_BYTES)}.`);
    }

    setEnviando(true);
    try {
      const supabase = createClient();
      const nomeSeguro = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
      const storagePath = `${tipo}/${crypto.randomUUID()}-${nomeSeguro}`;

      const { error } = await supabase.storage
        .from(CATALOGOS_BUCKET)
        .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (error) throw new Error(`Falha no upload: ${error.message}`);

      await registrarCatalogo({ tipo, storagePath, nomeArquivo: file.name });
      toast.success(`${nome} salvo. O agente de recrutamento já pode enviar.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  function handleRemover() {
    startRemover(async () => {
      try {
        await removerCatalogo(tipo);
        toast.success("PDF removido.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível remover.");
      } finally {
        setConfirmando(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-semibold">{nome}</p>
        <p className="text-xs text-muted-foreground">Enviado quando {quando}.</p>
      </div>

      {atual ? (
        <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{atual.nome_arquivo}</p>
            <p className="text-xs text-muted-foreground/70">
              {formatarTamanho(atual.tamanho_bytes)} · atualizado em{" "}
              {new Date(atual.updated_at).toLocaleString("pt-BR")}
            </p>
          </div>
          {confirmando ? (
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="destructive" onClick={handleRemover} disabled={removendo}>
                {removendo ? "Removendo..." : "Remover"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)} disabled={removendo}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remover ${nome}`}
              onClick={() => setConfirmando(true)}
              disabled={enviando}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum PDF ainda — o agente não oferece este material até você adicionar.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleArquivo(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={enviando || removendo}
        className="w-fit"
      >
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {enviando ? "Enviando..." : atual ? "Substituir PDF" : "Adicionar PDF"}
      </Button>
    </div>
  );
}

export function CatalogosEditor({ catalogos }: { catalogos: CatalogoRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">Catálogos em PDF</p>
        <p className="text-xs text-muted-foreground">
          Valem para o robô de recrutamento de todos os membros. O agente envia o PDF como documento no
          WhatsApp quando o lead pedir. Até {formatarTamanho(CATALOGO_PDF_MAX_BYTES)} cada.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CATALOGO_TIPOS.map((tipo) => (
          <SlotCatalogo key={tipo} tipo={tipo} atual={catalogos.find((c) => c.tipo === tipo)} />
        ))}
      </div>
    </div>
  );
}
