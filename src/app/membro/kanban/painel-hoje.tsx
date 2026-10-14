"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Hourglass, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarData, hojeBrasilia, somarDias } from "@/lib/kanban/origem";
import { adiarFollowup } from "./actions";

export type ItemHoje = {
  id: string;
  nome: string;
  telefone: string | null;
  quadro: string;
  coluna: string;
  followup: string | null;
  diasParado: number;
};

function linkWhats(telefone: string) {
  let d = telefone.replace(/\D/g, "");
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}`;
}

function Linha({ item, tipo }: { item: ItemHoje; tipo: "followup" | "parado" }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hoje = hojeBrasilia();

  function definir(data: string | null, msg: string) {
    startTransition(async () => {
      try {
        await adiarFollowup(item.id, data);
        toast.success(msg);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{item.nome}</span>
        <span className="text-xs text-muted-foreground">
          {item.quadro} · {item.coluna} ·{" "}
          {tipo === "followup" && item.followup
            ? item.followup < hoje
              ? `atrasado desde ${formatarData(item.followup)}`
              : "follow-up hoje"
            : `parado há ${item.diasParado} dias`}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.telefone && (
          <a
            href={linkWhats(item.telefone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium hover:bg-muted"
          >
            <MessageCircle className="size-3.5" />
            WhatsApp
          </a>
        )}
        {tipo === "followup" ? (
          <>
            <Button size="xs" variant="outline" disabled={isPending} onClick={() => definir(somarDias(hoje, 1), "Adiado para amanhã.")}>
              Amanhã
            </Button>
            <Button size="xs" variant="outline" disabled={isPending} onClick={() => definir(somarDias(hoje, 3), "Adiado 3 dias.")}>
              +3 dias
            </Button>
            <Button size="xs" disabled={isPending} onClick={() => definir(null, "Follow-up concluído.")}>
              Feito
            </Button>
          </>
        ) : (
          <Button size="xs" variant="outline" disabled={isPending} onClick={() => definir(somarDias(hoje, 1), "Follow-up agendado para amanhã.")}>
            Agendar p/ amanhã
          </Button>
        )}
      </div>
    </li>
  );
}

export function PainelHoje({
  followups,
  parados,
  totalParados,
}: {
  followups: ItemHoje[];
  parados: ItemHoje[];
  totalParados: number;
}) {
  if (followups.length === 0 && parados.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border p-4">
        <h2 className="flex items-center gap-2 font-medium">
          <CalendarClock className="size-4 text-amber-600 dark:text-amber-400" />
          Follow-ups de hoje
          <span className="text-sm font-normal text-muted-foreground tabular-nums">({followups.length})</span>
        </h2>
        {followups.length === 0 ? (
          <p className="pt-3 text-sm text-muted-foreground">Nenhum follow-up para hoje. 🎉</p>
        ) : (
          <ul className="divide-y text-sm">
            {followups.map((i) => (
              <Linha key={i.id} item={i} tipo="followup" />
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="flex items-center gap-2 font-medium">
          <Hourglass className="size-4 text-muted-foreground" />
          Leads parados
          <span className="text-sm font-normal text-muted-foreground tabular-nums">({totalParados})</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Sem mudar de etapa há 3 a 30 dias e sem follow-up marcado.
        </p>
        {parados.length === 0 ? (
          <p className="pt-3 text-sm text-muted-foreground">Nenhum lead parado.</p>
        ) : (
          <ul className="divide-y text-sm">
            {parados.map((i) => (
              <Linha key={i.id} item={i} tipo="parado" />
            ))}
            {totalParados > parados.length && (
              <li className="pt-3 text-xs text-muted-foreground">
                + {totalParados - parados.length} outros parados no Kanban.
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
