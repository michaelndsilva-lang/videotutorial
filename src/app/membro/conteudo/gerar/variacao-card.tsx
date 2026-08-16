"use client";

import { toast } from "sonner";
import { Copy, Heart, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { copiarVariacao, ConteudoVariacao } from "../_components/variacao-conteudo";
import type { FormatoConteudo } from "@/lib/types/database.types";

export function VariacaoCard({
  formato,
  resultado,
  favorito,
  regenerando,
  onFavoritar,
  onRegenerar,
}: {
  formato: FormatoConteudo;
  resultado: unknown;
  favorito: boolean;
  regenerando: boolean;
  onFavoritar: () => void;
  onRegenerar: () => void;
}) {
  async function handleCopiar() {
    await navigator.clipboard.writeText(copiarVariacao(formato, resultado));
    toast.success("Copiado!");
  }

  return (
    <Card className={cn(regenerando && "opacity-60")}>
      <CardContent className="flex flex-col gap-4 pt-6">
        {regenerando ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Regenerando...
          </div>
        ) : (
          <ConteudoVariacao formato={formato} resultado={resultado} />
        )}
        <div className="flex items-center gap-1.5 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" onClick={handleCopiar} disabled={regenerando}>
            <Copy /> Copiar
          </Button>
          <Button
            variant={favorito ? "default" : "outline"}
            size="icon-sm"
            onClick={onFavoritar}
            disabled={regenerando}
            aria-label="Favoritar"
          >
            <Heart className={cn(favorito && "fill-current")} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRegenerar} disabled={regenerando} aria-label="Regenerar">
            <RefreshCw />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
