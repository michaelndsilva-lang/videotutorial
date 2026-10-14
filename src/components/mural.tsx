"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, BellOff, CalendarPlus, Heart, Loader2, Pin, Trash2, Video } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatarEvento, linkGoogleAgenda } from "@/lib/mural/agenda";
import { cn } from "@/lib/utils";
import {
  alternarCurtida,
  alternarLembrete,
  publicarConquista,
  removerMinhaConquista,
} from "@/app/membro/mural/actions";

export type AvisoView = { id: string; titulo: string; texto: string; fixado: boolean; criadoEm: string };
export type EventoView = {
  id: string;
  titulo: string;
  descricao: string;
  inicio: string;
  duracaoMin: number;
  link: string | null;
  lembrar: boolean;
};
export type ConquistaView = {
  id: string;
  autor: string;
  texto: string;
  criadoEm: string;
  curtidas: number;
  curti: boolean;
  minha: boolean;
};

function useAcao() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  function executar(acao: () => Promise<void>, sucesso?: string, depois?: () => void) {
    startTransition(async () => {
      try {
        await acao();
        if (sucesso) toast.success(sucesso);
        depois?.();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
      }
    });
  }
  return { isPending, executar };
}

export function AvisosLista({ avisos }: { avisos: AvisoView[] }) {
  if (avisos.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {avisos.map((a) => (
        <li
          key={a.id}
          className={cn(
            "flex flex-col gap-1 rounded-xl border p-4",
            a.fixado && "border-amber-500/40 bg-amber-500/5"
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            {a.fixado && <Pin className="size-4 text-amber-600 dark:text-amber-400" />}
            {a.titulo}
          </span>
          {a.texto && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{a.texto}</p>}
        </li>
      ))}
    </ul>
  );
}

function EventoItem({ e }: { e: EventoView }) {
  const { isPending, executar } = useAcao();
  const agora = new Date().getTime();
  const inicio = new Date(e.inicio).getTime();
  const acontecendo = agora >= inicio - 15 * 60 * 1000 && agora <= inicio + e.duracaoMin * 60 * 1000;
  const futuro = inicio > agora;

  return (
    <li className="flex flex-col gap-2 rounded-xl border p-4">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-amber-700 capitalize dark:text-amber-400">
          {formatarEvento(e.inicio)}
          {acontecendo ? " · acontecendo agora" : ""}
        </span>
        <span className="font-medium">{e.titulo}</span>
      </div>
      {e.descricao && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{e.descricao}</p>}
      <div className="flex flex-wrap gap-2">
        {e.link && acontecendo && (
          <a href={e.link} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
            <Video className="size-4" />
            Entrar
          </a>
        )}
        {futuro && (
          <Button
            size="sm"
            variant={e.lembrar ? "secondary" : "outline"}
            disabled={isPending}
            onClick={() =>
              executar(
                () => alternarLembrete(e.id, !e.lembrar),
                e.lembrar ? "Lembrete cancelado." : "Combinado! Você recebe um WhatsApp 1 hora antes."
              )
            }
          >
            {e.lembrar ? <BellOff className="size-4" /> : <Bell className="size-4" />}
            {e.lembrar ? "Não lembrar" : "Quero ser lembrado"}
          </Button>
        )}
        {futuro && (
          <a
            href={linkGoogleAgenda(e)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            <CalendarPlus className="size-4" />
            Google Agenda
          </a>
        )}
      </div>
    </li>
  );
}

export function AgendaLista({ eventos }: { eventos: EventoView[] }) {
  if (eventos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento marcado por enquanto.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {eventos.map((e) => (
        <EventoItem key={e.id} e={e} />
      ))}
    </ul>
  );
}

export function ConquistasMural({ conquistas }: { conquistas: ConquistaView[] }) {
  const [texto, setTexto] = useState("");
  const { isPending, executar } = useAcao();

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          executar(() => publicarConquista(texto), "Conquista publicada! 🎉", () => setTexto(""));
        }}
      >
        <Textarea
          value={texto}
          onChange={(ev) => setTexto(ev.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Conte uma vitória: primeira venda, novo cadastro na equipe, meta batida…"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">{texto.length}/280</span>
          <Button type="submit" size="sm" disabled={isPending || !texto.trim()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Publicar
          </Button>
        </div>
      </form>
      {conquistas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Seja o primeiro a compartilhar uma conquista!</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {conquistas.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{c.autor}</span> ·{" "}
                  {new Date(c.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
                {c.minha && (
                  <button
                    type="button"
                    aria-label="Apagar minha conquista"
                    className="rounded p-1 hover:bg-muted"
                    disabled={isPending}
                    onClick={() => executar(() => removerMinhaConquista(c.id), "Conquista apagada.")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
              <button
                type="button"
                disabled={isPending}
                onClick={() => executar(() => alternarCurtida(c.id, !c.curti))}
                aria-pressed={c.curti}
                className={cn(
                  "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  c.curti ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400" : "hover:bg-muted"
                )}
              >
                <Heart className={cn("size-3.5", c.curti && "fill-current")} />
                {c.curtidas > 0 ? c.curtidas : "Curtir"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
