"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { enviarLeadPagina } from "./actions";

const OPCOES = [
  { valor: "negocio", label: "Oportunidade de negócio" },
  { valor: "energia", label: "Economizar na conta de luz" },
  { valor: "produtos", label: "Conhecer os produtos" },
] as const;

export function LeadForm({
  slug,
  primeiroNome,
  interesses,
  interesseInicial,
  textoConsentimento,
  produtoId,
  textoBotao,
}: {
  slug: string;
  primeiroNome: string;
  interesses: ("negocio" | "energia" | "produtos")[];
  interesseInicial?: "negocio" | "energia" | "produtos";
  textoConsentimento: string;
  produtoId?: string;
  textoBotao?: string;
}) {
  const [abertoEm] = useState(() => Date.now());
  const [interesse, setInteresse] = useState(interesseInicial ?? interesses[0] ?? "negocio");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [isPending, startTransition] = useTransition();
  const opcoes = OPCOES.filter((o) => interesses.includes(o.valor));

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
        <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        <p className="font-medium">Recebido! 🎉</p>
        <p className="text-sm text-muted-foreground">
          {primeiroNome} vai te chamar no WhatsApp em breve.
        </p>
      </div>
    );
  }

  return (
    <form
      id="contato"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("interesse", interesse);
        fd.set("t", String(abertoEm));
        if (produtoId) fd.set("produto_id", produtoId);
        setErro(null);
        startTransition(async () => {
          const r = await enviarLeadPagina(slug, fd);
          if (r.ok) setEnviado(true);
          else setErro(r.erro);
        });
      }}
    >
      {opcoes.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Tenho interesse em</legend>
          <div className="flex flex-wrap gap-2">
            {opcoes.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => setInteresse(o.valor)}
                aria-pressed={interesse === o.valor}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  interesse === o.valor
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" name="nome" required maxLength={80} autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="telefone">Seu WhatsApp</Label>
        <Input
          id="telefone"
          name="telefone"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="(84) 99999-9999"
        />
      </div>
      {/* Armadilha para robôs: invisível para pessoas. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Empresa
          <input type="text" name="empresa" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="consentimento" required className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          {textoConsentimento.replace("Política de Privacidade.", "")}
          <Link href="/privacidade" target="_blank" className="underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {textoBotao ?? `Quero que ${primeiroNome} me chame`}
      </Button>
    </form>
  );
}
