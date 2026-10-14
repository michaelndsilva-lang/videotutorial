"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIA_AJUDA } from "@/lib/radar/radar";
import { cn } from "@/lib/utils";
import { abrirPedidoAjuda } from "./actions";

export function AjudaForm({ temPatrocinador }: { temPatrocinador: boolean }) {
  const [categoria, setCategoria] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            await abrirPedidoAjuda(categoria, mensagem);
            toast.success(
              temPatrocinador
                ? "Pedido enviado! Seu líder e o administrador foram avisados."
                : "Pedido enviado! O administrador foi avisado."
            );
            setCategoria("");
            setMensagem("");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
          }
        });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Onde você travou?</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIA_AJUDA).map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={categoria === valor}
              onClick={() => setCategoria(valor)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                categoria === valor ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mensagem">Conte o que aconteceu</Label>
        <Textarea
          id="mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Ex.: o lead disse que não tem dinheiro agora e eu não soube o que responder."
        />
      </div>
      <Button type="submit" className="w-fit" disabled={isPending || !categoria || !mensagem.trim()}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Pedir ajuda
      </Button>
    </form>
  );
}
