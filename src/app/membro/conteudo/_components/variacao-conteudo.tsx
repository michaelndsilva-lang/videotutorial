import { Badge } from "@/components/ui/badge";
import type { FormatoConteudo } from "@/lib/types/database.types";
import type { VariacaoPorFormato } from "@/lib/ai/motor-conteudo";

export function copiarVariacao(formato: FormatoConteudo, resultado: unknown): string {
  switch (formato) {
    case "reels": {
      const v = resultado as VariacaoPorFormato["reels"];
      return [
        v.gancho,
        v.desenvolvimento,
        `CTA: ${v.cta}`,
        `[Sugestão visual: ${v.sugestao_visual}]`,
        `[Duração estimada: ${v.duracao_estimada_seg}s]`,
        "",
        v.legenda_curta,
        v.hashtags.join(" "),
      ].join("\n");
    }
    case "legenda_post": {
      const v = resultado as VariacaoPorFormato["legenda_post"];
      return [v.primeira_linha, "", v.corpo, "", v.cta, v.hashtags.join(" "), "", `[Sugestão de imagem: ${v.sugestao_de_imagem}]`].join(
        "\n"
      );
    }
    case "stories": {
      const v = resultado as VariacaoPorFormato["stories"];
      return [
        ...v.sequencia.map(
          (tela) =>
            `Tela ${tela.tela}: ${tela.texto}\n[Ação visual: ${tela.acao_visual}]` +
            (tela.elemento_interativo ? `\n[Elemento interativo: ${tela.elemento_interativo}]` : "")
        ),
        "",
        `CTA final: ${v.cta_final}`,
      ].join("\n\n");
    }
    case "whatsapp_prospeccao": {
      const v = resultado as VariacaoPorFormato["whatsapp_prospeccao"];
      return [`[${v.contexto_de_uso}]`, "", v.mensagem_1, "", v.mensagem_2, "", v.pergunta_de_abertura].join("\n");
    }
  }
}

export function ConteudoVariacao({ formato, resultado }: { formato: FormatoConteudo; resultado: unknown }) {
  switch (formato) {
    case "reels": {
      const v = resultado as VariacaoPorFormato["reels"];
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium text-foreground">{v.gancho}</p>
          <p className="text-muted-foreground">{v.desenvolvimento}</p>
          <p className="font-medium">{v.cta}</p>
          <p className="text-xs text-muted-foreground">
            Visual: {v.sugestao_visual} · ~{v.duracao_estimada_seg}s
          </p>
          <p className="text-xs text-muted-foreground">{v.legenda_curta}</p>
          <div className="flex flex-wrap gap-1">
            {v.hashtags.map((h) => (
              <Badge key={h} variant="secondary" className="text-[0.65rem]">
                {h}
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    case "legenda_post": {
      const v = resultado as VariacaoPorFormato["legenda_post"];
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium text-foreground">{v.primeira_linha}</p>
          <p className="text-muted-foreground whitespace-pre-line">{v.corpo}</p>
          <p className="font-medium">{v.cta}</p>
          <div className="flex flex-wrap gap-1">
            {v.hashtags.map((h) => (
              <Badge key={h} variant="secondary" className="text-[0.65rem]">
                {h}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Imagem: {v.sugestao_de_imagem}</p>
        </div>
      );
    }
    case "stories": {
      const v = resultado as VariacaoPorFormato["stories"];
      return (
        <div className="flex flex-col gap-3 text-sm">
          {v.sequencia.map((tela) => (
            <div key={tela.tela} className="rounded-lg border border-border/60 p-2">
              <p className="text-xs font-semibold text-muted-foreground">Tela {tela.tela}</p>
              <p className="text-foreground">{tela.texto}</p>
              <p className="text-xs text-muted-foreground">Ação: {tela.acao_visual}</p>
              {tela.elemento_interativo && (
                <p className="text-xs text-muted-foreground">Interativo: {tela.elemento_interativo}</p>
              )}
            </div>
          ))}
          <p className="font-medium">{v.cta_final}</p>
        </div>
      );
    }
    case "whatsapp_prospeccao": {
      const v = resultado as VariacaoPorFormato["whatsapp_prospeccao"];
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-xs text-muted-foreground">{v.contexto_de_uso}</p>
          <p className="rounded-lg bg-muted px-2.5 py-1.5 text-foreground">{v.mensagem_1}</p>
          <p className="rounded-lg bg-muted px-2.5 py-1.5 text-foreground">{v.mensagem_2}</p>
          <p className="font-medium">{v.pergunta_de_abertura}</p>
        </div>
      );
    }
  }
}
