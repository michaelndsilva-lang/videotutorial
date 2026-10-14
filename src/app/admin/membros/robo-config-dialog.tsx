"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODOS_ROBO_LABEL } from "@/lib/acesso/labels";
import { atualizarRobo, liberarRobo } from "./actions";
import type { AgenteModo } from "@/lib/types/database.types";

const MODOS = Object.keys(MODOS_ROBO_LABEL) as AgenteModo[];

// Liberar o robô (ou editar modos/limite de quem já tem) para um membro.
export function RoboConfigDialog({
  usuarioId,
  nome,
  modo,
  modosIniciais,
  limiteInicial,
  triggerLabel,
}: {
  usuarioId: string;
  nome: string;
  modo: "liberar" | "editar";
  modosIniciais: AgenteModo[];
  limiteInicial: number;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [modos, setModos] = useState<AgenteModo[]>(
    modosIniciais.filter((m) => MODOS.includes(m))
  );
  const [limite, setLimite] = useState(String(limiteInicial));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function alternar(m: AgenteModo) {
    setModos((atual) => (atual.includes(m) ? atual.filter((x) => x !== m) : [...atual, m]));
  }

  function salvar() {
    startTransition(async () => {
      try {
        const n = Number(limite);
        if (modo === "liberar") {
          await liberarRobo(usuarioId, modos, n);
          toast.success(`Robô liberado para ${nome}.`);
        } else {
          await atualizarRobo(usuarioId, modos, n);
          toast.success("Configuração do robô salva.");
        }
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant={modo === "liberar" ? "default" : "outline"} />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === "liberar" ? `Liberar robô para ${nome}` : `Robô de ${nome}`}
          </DialogTitle>
          <DialogDescription>
            Escolha os modos que o membro pode usar e quantas respostas o robô pode enviar por
            dia (follow-ups contam no limite).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Modos permitidos</legend>
            {MODOS.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={modos.includes(m)}
                  onChange={() => alternar(m)}
                />
                {MODOS_ROBO_LABEL[m]}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor="limite">Limite diário de respostas</Label>
            <Input
              id="limite"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={isPending || modos.length === 0}>
            {modo === "liberar" ? "Liberar robô" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
