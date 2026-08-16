"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, Zap, ShoppingBag, Award, Clapperboard, ImageIcon, BookOpen, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { gerarConteudo, type VariacaoGerada } from "./actions";
import { alternarFavorito } from "../actions";
import { VariacaoCard } from "./variacao-card";
import { OBJETIVO_LABEL, FORMATO_LABEL } from "@/lib/content/labels";
import type { ObjetivoConteudo, FormatoConteudo } from "@/lib/types/database.types";

const OBJETIVOS: { valor: ObjetivoConteudo; label: string; Icon: typeof UserPlus }[] = [
  { valor: "recrutamento", label: OBJETIVO_LABEL.recrutamento, Icon: UserPlus },
  { valor: "energia_assinatura", label: OBJETIVO_LABEL.energia_assinatura, Icon: Zap },
  { valor: "venda_produto", label: OBJETIVO_LABEL.venda_produto, Icon: ShoppingBag },
  { valor: "autoridade_pessoal", label: OBJETIVO_LABEL.autoridade_pessoal, Icon: Award },
];

const FORMATOS: { valor: FormatoConteudo; label: string; Icon: typeof Clapperboard }[] = [
  { valor: "reels", label: FORMATO_LABEL.reels, Icon: Clapperboard },
  { valor: "legenda_post", label: FORMATO_LABEL.legenda_post, Icon: ImageIcon },
  { valor: "stories", label: FORMATO_LABEL.stories, Icon: BookOpen },
  { valor: "whatsapp_prospeccao", label: FORMATO_LABEL.whatsapp_prospeccao, Icon: MessageCircle },
];

type VariacaoState = VariacaoGerada & { favorito: boolean; regenerando: boolean };

function SelectorCard({
  label,
  Icon,
  selecionado,
  onClick,
}: {
  label: string;
  Icon: typeof UserPlus;
  selecionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-medium transition-colors",
        selecionado
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      <Icon className="size-6" />
      {label}
    </button>
  );
}

export function GerarForm({ saldoInicial }: { saldoInicial: number | null }) {
  const [objetivo, setObjetivo] = useState<ObjetivoConteudo | null>(null);
  const [formato, setFormato] = useState<FormatoConteudo | null>(null);
  const [temaLivre, setTemaLivre] = useState("");
  const [saldo, setSaldo] = useState(saldoInicial);
  const [variacoes, setVariacoes] = useState<VariacaoState[]>([]);
  const [formatoGerado, setFormatoGerado] = useState<FormatoConteudo | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGerar() {
    if (!objetivo || !formato) return;
    startTransition(async () => {
      const resultado = await gerarConteudo({ objetivo, formato, temaLivre });
      if (!resultado.sucesso) {
        toast.error(resultado.erro);
        return;
      }
      setVariacoes(resultado.variacoes.map((v) => ({ ...v, favorito: false, regenerando: false })));
      setFormatoGerado(formato);
      if (resultado.saldoApos !== null) setSaldo(resultado.saldoApos);
      toast.success("Conteúdo gerado!");
    });
  }

  function handleRegenerar(index: number) {
    if (!objetivo || !formato) return;
    setVariacoes((prev) => prev.map((v, i) => (i === index ? { ...v, regenerando: true } : v)));
    startTransition(async () => {
      const resultado = await gerarConteudo({ objetivo, formato, temaLivre, quantidade: 1 });
      if (!resultado.sucesso) {
        toast.error(resultado.erro);
        setVariacoes((prev) => prev.map((v, i) => (i === index ? { ...v, regenerando: false } : v)));
        return;
      }
      const nova = resultado.variacoes[0];
      setVariacoes((prev) => prev.map((v, i) => (i === index ? { ...nova, favorito: false, regenerando: false } : v)));
      if (resultado.saldoApos !== null) setSaldo(resultado.saldoApos);
      toast.success("Variação regenerada.");
    });
  }

  function handleFavoritar(index: number) {
    const variacao = variacoes[index];
    const novoFavorito = !variacao.favorito;
    setVariacoes((prev) => prev.map((v, i) => (i === index ? { ...v, favorito: novoFavorito } : v)));
    alternarFavorito(variacao.geracaoId, novoFavorito).catch((err) => {
      setVariacoes((prev) => prev.map((v, i) => (i === index ? { ...v, favorito: !novoFavorito } : v)));
      toast.error(err instanceof Error ? err.message : "Não foi possível favoritar.");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {saldo !== null && (
        <div className="self-start rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {saldo} crédito{saldo === 1 ? "" : "s"} restante{saldo === 1 ? "" : "s"}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Label>1. Objetivo</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OBJETIVOS.map((o) => (
            <SelectorCard key={o.valor} label={o.label} Icon={o.Icon} selecionado={objetivo === o.valor} onClick={() => setObjetivo(o.valor)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>2. Formato</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FORMATOS.map((f) => (
            <SelectorCard key={f.valor} label={f.label} Icon={f.Icon} selecionado={formato === f.valor} onClick={() => setFormato(f.valor)} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tema_livre">3. Tema específico (opcional)</Label>
        <Input
          id="tema_livre"
          value={temaLivre}
          onChange={(e) => setTemaLivre(e.target.value)}
          placeholder="Deixe em branco e o sistema decide"
        />
      </div>

      <Button onClick={handleGerar} disabled={!objetivo || !formato || isPending} size="lg" className="self-start">
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? "Gerando..." : "GERAR"}
      </Button>

      {variacoes.length > 0 && formatoGerado && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {variacoes.map((variacao, i) => (
            <VariacaoCard
              key={variacao.geracaoId}
              formato={formatoGerado}
              resultado={variacao.resultado}
              favorito={variacao.favorito}
              regenerando={variacao.regenerando}
              onFavoritar={() => handleFavoritar(i)}
              onRegenerar={() => handleRegenerar(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
