"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { copiarVariacao, ConteudoVariacao } from "../_components/variacao-conteudo";
import { OBJETIVO_LABEL, FORMATO_LABEL } from "@/lib/content/labels";
import { alternarFavorito } from "../actions";
import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

export type ItemBiblioteca = {
  id: string;
  objetivo: ObjetivoConteudo;
  formato: FormatoConteudo;
  resultado: unknown;
  favorito: boolean;
  created_at: string;
};

const formatadorData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function BibliotecaCard({ item, onToggleFavorito }: { item: ItemBiblioteca; onToggleFavorito: () => void }) {
  async function handleCopiar() {
    await navigator.clipboard.writeText(copiarVariacao(item.formato, item.resultado));
    toast.success("Copiado!");
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[0.65rem]">
            {OBJETIVO_LABEL[item.objetivo]}
          </Badge>
          <Badge variant="secondary" className="text-[0.65rem]">
            {FORMATO_LABEL[item.formato]}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">{formatadorData.format(new Date(item.created_at))}</span>
        </div>
        <ConteudoVariacao formato={item.formato} resultado={item.resultado} />
        <div className="flex items-center gap-1.5 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" onClick={handleCopiar}>
            <Copy /> Copiar
          </Button>
          <Button variant={item.favorito ? "default" : "outline"} size="icon-sm" onClick={onToggleFavorito} aria-label="Favoritar">
            <Heart className={cn(item.favorito && "fill-current")} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function BibliotecaGrid({
  itensIniciais,
  apenasFavoritos,
}: {
  itensIniciais: ItemBiblioteca[];
  apenasFavoritos: boolean;
}) {
  const [itens, setItens] = useState(itensIniciais);

  function handleToggleFavorito(id: string) {
    const item = itens.find((i) => i.id === id);
    if (!item) return;
    const novoFavorito = !item.favorito;

    // Na aba "Favoritos", desfavoritar remove o card da lista na hora — em
    // qualquer outra aba, só atualiza o estado do coração.
    setItens((prev) =>
      apenasFavoritos && !novoFavorito
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, favorito: novoFavorito } : i))
    );

    alternarFavorito(id, novoFavorito).catch((err) => {
      setItens(itensIniciais);
      toast.error(err instanceof Error ? err.message : "Não foi possível favoritar.");
    });
  }

  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum conteúdo aqui ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {itens.map((item) => (
        <BibliotecaCard key={item.id} item={item} onToggleFavorito={() => handleToggleFavorito(item.id)} />
      ))}
    </div>
  );
}
