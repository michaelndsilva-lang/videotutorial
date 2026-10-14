"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// O cliente também pode simular sozinho pelo link público (e o "Quero essa
// economia" cai no Kanban do membro com origem Simulador).
export function LinkSimuladorPublico({ url }: { url: string }) {
  return (
    <div className="flex max-w-xl flex-col gap-2 rounded-xl border p-4 text-sm">
      <span className="font-medium">Link para o cliente simular sozinho</span>
      <span className="break-all text-muted-foreground">{url}</span>
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
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
