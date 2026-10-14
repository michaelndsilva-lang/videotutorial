"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { perguntar } from "./actions";

type Turno = { pergunta: string; resposta: string; semBase?: boolean };

const SUGESTOES = [
  "Quanto custa para começar?",
  "Como funciona a energia por assinatura?",
  "O que respondo quando perguntam se é pirâmide?",
];

export function MentorChat({
  historicoInicial,
  restantesIniciais,
  limite,
  ativo,
}: {
  historicoInicial: Turno[];
  restantesIniciais: number;
  limite: number;
  ativo: boolean;
}) {
  const [turnos, setTurnos] = useState<Turno[]>(historicoInicial);
  const [pendente, setPendente] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [restantes, setRestantes] = useState(restantesIniciais);
  const [isPending, startTransition] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnos.length, pendente]);

  function enviar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || isPending) return;
    setPendente(limpa);
    setTexto("");
    startTransition(async () => {
      try {
        const r = await perguntar(limpa, turnos.slice(-3));
        if (r.ok) {
          setTurnos((t) => [...t, { pergunta: limpa, resposta: r.resposta, semBase: r.semBase }]);
          setRestantes(r.restantes);
        } else {
          toast.error(r.mensagem);
          if (r.motivo === "limite") setRestantes(0);
          setTexto(limpa);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível perguntar.");
        setTexto(limpa);
      } finally {
        setPendente(null);
      }
    });
  }

  const bloqueado = !ativo || restantes <= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[40vh] flex-col gap-4 rounded-xl border bg-muted/20 p-4">
        {turnos.length === 0 && !pendente && (
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Oi! Eu respondo com base nos materiais oficiais da equipe. Pergunte sobre produtos,
              adesão, energia ou como abordar seus contatos.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => enviar(s)}
                  className="rounded-full border bg-background px-3 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turnos.map((t, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
              {t.pergunta}
            </div>
            <div
              className={cn(
                "max-w-[90%] self-start rounded-2xl rounded-bl-sm border bg-background px-3 py-2 text-sm whitespace-pre-wrap",
                t.semBase && "border-amber-500/40"
              )}
            >
              {t.resposta}
            </div>
          </div>
        ))}

        {pendente && (
          <div className="flex flex-col gap-2">
            <div className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
              {pendente}
            </div>
            <div className="flex items-center gap-2 self-start rounded-2xl border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Pensando…
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            placeholder={
              !ativo
                ? "O Mentor está desativado no momento."
                : restantes <= 0
                  ? "Você usou todas as perguntas de hoje."
                  : "Escreva sua dúvida"
            }
            maxLength={1000}
            rows={2}
            disabled={bloqueado}
            className="min-h-0 flex-1 resize-none"
          />
          <Button type="submit" size="icon" aria-label="Enviar" disabled={bloqueado || isPending || !texto.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {ativo ? `${restantes} de ${limite} perguntas restantes hoje` : "Mentor desativado"}
        </span>
      </form>
    </div>
  );
}
