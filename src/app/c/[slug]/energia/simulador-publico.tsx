"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimuladorEnergia } from "@/components/simulador-energia";
import type { ConfigSimulador } from "@/lib/energia/simulador";
import { enviarLeadSimulador } from "../actions";

function AderirForm({
  slug,
  primeiroNome,
  valor,
  uf,
  textoConsentimento,
}: {
  slug: string;
  primeiroNome: string;
  valor: number;
  uf: string;
  textoConsentimento: string;
}) {
  const [abertoEm] = useState(() => Date.now());
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (enviado) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        Recebido! {primeiroNome} vai te chamar no WhatsApp para analisar sua conta.
      </div>
    );
  }
  if (!aberto) {
    return (
      <Button size="lg" onClick={() => setAberto(true)}>
        Quero essa economia
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 border-t pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("valor", String(valor));
        fd.set("uf", uf);
        fd.set("t", String(abertoEm));
        setErro(null);
        startTransition(async () => {
          const r = await enviarLeadSimulador(slug, fd);
          if (r.ok) setEnviado(true);
          else setErro(r.erro);
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome-sim">Seu nome</Label>
        <Input id="nome-sim" name="nome" required maxLength={80} autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tel-sim">Seu WhatsApp</Label>
        <Input id="tel-sim" name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(84) 99999-9999" />
      </div>
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
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Quero que {primeiroNome} me chame
      </Button>
    </form>
  );
}

export function SimuladorPublico({
  slug,
  primeiroNome,
  config,
  textoConsentimento,
}: {
  slug: string;
  primeiroNome: string;
  config: ConfigSimulador;
  textoConsentimento: string;
}) {
  return (
    <SimuladorEnergia config={config} propostaUrl={`/c/${slug}/energia/proposta`}>
      {({ valor, uf }) => (
        <AderirForm
          slug={slug}
          primeiroNome={primeiroNome}
          valor={valor}
          uf={uf}
          textoConsentimento={textoConsentimento}
        />
      )}
    </SimuladorEnergia>
  );
}
