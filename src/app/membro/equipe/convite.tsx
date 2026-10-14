"use client";

import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function ConviteLink({ url }: { url: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm break-all text-muted-foreground">{url}</span>
      <div className="flex flex-wrap gap-2">
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
          Copiar
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Faça seu cadastro na ATL Prospect, a plataforma da nossa equipe: ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm" })}
        >
          <MessageCircle className="size-4" />
          Enviar no WhatsApp
        </a>
      </div>
    </div>
  );
}
