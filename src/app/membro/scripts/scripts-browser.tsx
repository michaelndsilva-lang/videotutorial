"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, MessageCircle, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aplicarVariaveis, linkWhatsapp, variaveisPendentes } from "@/lib/scripts/variaveis";
import { cn } from "@/lib/utils";
import { registrarUsoScript } from "./actions";

export type ScriptItem = { id: string; categoria: string; titulo: string; texto: string };

const PENDENTE_LABEL: Record<string, string> = {
  "{meu_nome}": "seu nome",
  "{meu_link}": "seu link de recrutamento",
  "{link_energia}": "seu link de energia",
};

export function ScriptsBrowser({
  scripts,
  categorias,
  meuNome,
  meuLink,
  linkEnergia,
}: {
  scripts: ScriptItem[];
  categorias: string[];
  meuNome: string;
  meuLink: string;
  linkEnergia: string;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [nomeLead, setNomeLead] = useState("");
  const [telefone, setTelefone] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return scripts.filter(
      (s) =>
        (!categoria || s.categoria === categoria) &&
        (!termo || s.titulo.toLowerCase().includes(termo) || s.texto.toLowerCase().includes(termo))
    );
  }, [scripts, busca, categoria]);

  const valores = { nomeLead, meuNome, meuLink, linkEnergia };

  async function copiar(script: ScriptItem, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado! É só colar na conversa.");
    } catch {
      toast.error("Não foi possível copiar. Segure o texto e copie manualmente.");
      return;
    }
    void registrarUsoScript(script.id, "copiar");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nome-lead">Nome do contato</Label>
          <Input
            id="nome-lead"
            value={nomeLead}
            onChange={(e) => setNomeLead(e.target.value)}
            placeholder="Ex.: Carla"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tel-lead">WhatsApp do contato (opcional)</Label>
          <Input
            id="tel-lead"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(84) 99999-9999"
            inputMode="tel"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar script"
          className="pl-9"
          aria-label="Buscar script"
        />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[null, ...categorias].map((c) => (
          <button
            key={c ?? "todas"}
            type="button"
            onClick={() => setCategoria(c)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              categoria === c
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {c ?? "Todas"}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum script encontrado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtrados.map((s) => {
            const texto = aplicarVariaveis(s.texto, valores);
            const pendentes = variaveisPendentes(texto);
            return (
              <li key={s.id} className="flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{s.titulo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.categoria}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{texto}</p>
                {pendentes.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Falta {pendentes.map((p) => PENDENTE_LABEL[p] ?? p).join(" e ")}.{" "}
                    <Link href="/membro/perfil" className="underline underline-offset-2">
                      Preencher no perfil
                    </Link>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copiar(s, texto)}>
                    <Copy className="size-4" />
                    Copiar
                  </Button>
                  <a
                    href={linkWhatsapp(texto, telefone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => void registrarUsoScript(s.id, "whatsapp")}
                    className={buttonVariants({ size: "sm" })}
                  >
                    <MessageCircle className="size-4" />
                    Abrir no WhatsApp
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
