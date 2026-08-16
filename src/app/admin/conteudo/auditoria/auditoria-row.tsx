"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OBJETIVO_LABEL, FORMATO_LABEL } from "@/lib/content/labels";
import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

export type ItemAuditoria = {
  id: string;
  objetivo: ObjetivoConteudo;
  formato: FormatoConteudo;
  tema_livre: string | null;
  prompt_final: string;
  resultado: unknown;
  created_at: string;
  nome: string;
};

export function AuditoriaRow({ item }: { item: ItemAuditoria }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{item.nome}</TableCell>
        <TableCell className="text-muted-foreground">{OBJETIVO_LABEL[item.objetivo]}</TableCell>
        <TableCell className="text-muted-foreground">{FORMATO_LABEL[item.formato]}</TableCell>
        <TableCell className="text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="icon-sm" onClick={() => setOpen(true)} aria-label="Ver detalhes">
            <Eye />
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {item.nome} · {OBJETIVO_LABEL[item.objetivo]} · {FORMATO_LABEL[item.formato]}
            </DialogTitle>
            <DialogDescription>{new Date(item.created_at).toLocaleString("pt-BR")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-sm">
            {item.tema_livre && (
              <div>
                <Badge variant="secondary" className="mb-1">
                  Tema pedido pelo membro
                </Badge>
                <p className="text-muted-foreground">{item.tema_livre}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Prompt enviado ao modelo</p>
              <pre className="max-h-64 overflow-y-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                {item.prompt_final}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Resultado</p>
              <pre className="max-h-64 overflow-y-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                {JSON.stringify(item.resultado, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
