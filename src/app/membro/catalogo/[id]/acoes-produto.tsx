"use client";

import { toast } from "sonner";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { aplicarVariaveis, linkWhatsapp } from "@/lib/scripts/variaveis";

export function ScriptsDoProduto({
  scripts,
  valores,
}: {
  scripts: { id: string; titulo: string; texto: string }[];
  valores: { meuNome: string; meuLink: string; linkEnergia: string };
}) {
  return (
    <ul className="flex flex-col gap-3">
      {scripts.map((s) => {
        const texto = aplicarVariaveis(s.texto, { nomeLead: "", ...valores });
        return (
          <li key={s.id} className="flex flex-col gap-2 rounded-xl border p-3">
            <span className="text-sm font-medium">{s.titulo}</span>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{texto}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(texto);
                    toast.success("Copiado!");
                  } catch {
                    toast.error("Não foi possível copiar.");
                  }
                }}
              >
                <Copy className="size-4" />
                Copiar
              </Button>
              <a href={linkWhatsapp(texto, "")} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
                <MessageCircle className="size-4" />
                Abrir no WhatsApp
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CompartilharProduto({ url, nome }: { url: string; nome: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${nome} 😍\n${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ size: "sm" })}
      >
        <Share2 className="size-4" />
        Compartilhar no WhatsApp
      </a>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copiado!");
          } catch {
            toast.error("Não foi possível copiar.");
          }
        }}
      >
        <Copy className="size-4" />
        Copiar link
      </Button>
    </div>
  );
}
