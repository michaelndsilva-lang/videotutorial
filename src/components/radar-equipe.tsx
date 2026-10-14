"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIA_AJUDA,
  COR_CLASSE,
  COR_LABEL,
  STATUS_AJUDA,
  linkWhatsappNumero,
  type CorRadar,
} from "@/lib/radar/radar";
import { atualizarPedidoAjuda } from "@/lib/radar/actions";
import { cn } from "@/lib/utils";

export type LinhaRadar = {
  id: string;
  nome: string;
  telefone: string | null;
  patrocinador: string | null;
  nivel?: number;
  dias: number;
  cor: CorRadar;
  ultimoAcesso: string | null;
  leads7d: number;
  ajudasAbertas: number;
};

function quando(dias: number) {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

export function RadarLista({ linhas, mostrarPatrocinador }: { linhas: LinhaRadar[]; mostrarPatrocinador: boolean }) {
  const [filtro, setFiltro] = useState<CorRadar | null>(null);
  const contagem = (c: CorRadar) => linhas.filter((l) => l.cor === c).length;
  const visiveis = linhas.filter((l) => !filtro || l.cor === filtro);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFiltro(null)}
          className={cn("rounded-full border px-3 py-1 text-sm", !filtro ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          Todos ({linhas.length})
        </button>
        {(["vermelho", "amarelo", "verde"] as CorRadar[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFiltro(filtro === c ? null : c)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
              filtro === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <span className={cn("size-2.5 rounded-full", COR_CLASSE[c])} aria-hidden />
            {COR_LABEL[c]} ({contagem(c)})
          </button>
        ))}
      </div>
      {visiveis.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Ninguém nesta faixa.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {visiveis.map((l) => {
            const whats = linkWhatsappNumero(
              l.telefone,
              l.cor === "verde"
                ? `Oi, ${l.nome.split(" ")[0]}! Tudo bem? Vi que você está mandando bem na plataforma 👏`
                : `Oi, ${l.nome.split(" ")[0]}! Tudo bem? Senti sua falta por aqui. Posso te ajudar em alguma coisa? 😊`
            );
            return (
              <li key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn("mt-1.5 size-3 shrink-0 rounded-full", COR_CLASSE[l.cor])}
                    role="img"
                    aria-label={COR_LABEL[l.cor]}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="flex flex-wrap items-center gap-1.5 font-medium">
                      {l.nome}
                      {l.ajudasAbertas > 0 && (
                        <Badge variant="destructive">
                          <LifeBuoy className="size-3" />
                          {l.ajudasAbertas} pedido(s)
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {COR_LABEL[l.cor]} · última atividade {quando(l.dias)} · {l.leads7d} lead(s) em 7 dias
                      {mostrarPatrocinador && l.patrocinador ? ` · indicado por ${l.patrocinador}` : ""}
                      {l.nivel && l.nivel > 1 ? ` · ${l.nivel}º nível` : ""}
                    </span>
                  </div>
                </div>
                {whats ? (
                  <a
                    href={whats}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium hover:bg-muted"
                  >
                    <MessageCircle className="size-3.5" />
                    Chamar no WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem WhatsApp cadastrado</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export type PedidoView = {
  id: string;
  membro: string;
  categoria: string;
  mensagem: string;
  status: string;
  resposta: string | null;
  criadoEm: string;
};

function PedidoItem({ p }: { p: PedidoView }) {
  const [resposta, setResposta] = useState(p.resposta ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function salvar(status: string) {
    startTransition(async () => {
      try {
        await atualizarPedidoAjuda(p.id, status, resposta);
        toast.success(status === "resolvido" ? "Pedido resolvido. O membro foi avisado." : "Pedido atualizado.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={p.status === "resolvido" ? "default" : p.status === "em_atendimento" ? "secondary" : "outline"}>
          {STATUS_AJUDA[p.status]}
        </Badge>
        <span className="font-medium text-foreground">{p.membro}</span>
        <span>· {CATEGORIA_AJUDA[p.categoria]}</span>
        <span>· {new Date(p.criadoEm).toLocaleString("pt-BR")}</span>
      </div>
      <p className="whitespace-pre-wrap">{p.mensagem}</p>
      {p.status !== "resolvido" ? (
        <>
          <Textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Resposta (opcional): o membro recebe no WhatsApp"
          />
          <div className="flex flex-wrap gap-2">
            {p.status === "aberto" && (
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => salvar("em_atendimento")}>
                Estou atendendo
              </Button>
            )}
            <Button size="sm" disabled={isPending} onClick={() => salvar("resolvido")}>
              Marcar como resolvido
            </Button>
          </div>
        </>
      ) : (
        p.resposta && <p className="rounded-lg bg-muted/50 p-2 whitespace-pre-wrap">{p.resposta}</p>
      )}
    </li>
  );
}

export function PedidosAjudaLista({ pedidos }: { pedidos: PedidoView[] }) {
  if (pedidos.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">Nenhum pedido de ajuda.</p>;
  }
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {pedidos.map((p) => (
        <PedidoItem key={p.id} p={p} />
      ))}
    </ul>
  );
}
