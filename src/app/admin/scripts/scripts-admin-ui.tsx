"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VARIAVEIS, aplicarVariaveis } from "@/lib/scripts/variaveis";
import {
  alternarCategoriaAtiva,
  alternarScriptAtivo,
  ativarScriptsDaCategoria,
  criarCategoria,
  moverCategoria,
  moverScript,
  removerCategoria,
  removerScript,
  renomearCategoria,
  salvarScript,
} from "./actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const EXEMPLO = {
  nomeLead: "Carla",
  meuNome: "Seu Nome",
  meuLink: "https://cadastro.atlanticanatural.com.br/seulink",
  linkEnergia: "https://seu-link-de-energia",
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

function ConfirmarRemocao({
  titulo,
  descricao,
  onConfirm,
  disabled,
}: {
  titulo: string;
  descricao: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant="destructive" disabled={disabled}>
            Remover
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Setas({
  primeiro,
  ultimo,
  disabled,
  onMover,
}: {
  primeiro: boolean;
  ultimo: boolean;
  disabled: boolean;
  onMover: (d: "cima" | "baixo") => void;
}) {
  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para cima"
        disabled={disabled || primeiro}
        onClick={() => onMover("cima")}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Mover para baixo"
        disabled={disabled || ultimo}
        onClick={() => onMover("baixo")}
      >
        <ArrowDown className="size-4" />
      </Button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export function NovaCategoria() {
  const [nome, setNome] = useState("");
  const { isPending, executar } = useAcao();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => criarCategoria(nome), "Categoria criada.", () => setNome(""));
      }}
    >
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nova categoria"
        maxLength={40}
        className="h-8 w-44"
        aria-label="Nome da nova categoria"
      />
      <Button size="sm" variant="outline" type="submit" disabled={isPending || !nome.trim()}>
        <Plus className="size-4" />
        Categoria
      </Button>
    </form>
  );
}

export function CategoriaAcoes({
  id,
  nome,
  ativo,
  primeiro,
  ultimo,
  totalScripts,
  inativos,
}: {
  id: string;
  nome: string;
  ativo: boolean;
  primeiro: boolean;
  ultimo: boolean;
  totalScripts: number;
  inativos: number;
}) {
  const { isPending, executar } = useAcao();
  const [renomeando, setRenomeando] = useState(false);
  const [novoNome, setNovoNome] = useState(nome);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Setas
        primeiro={primeiro}
        ultimo={ultimo}
        disabled={isPending}
        onMover={(d) => executar(() => moverCategoria(id, d))}
      />
      {inativos > 0 && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            executar(
              () => ativarScriptsDaCategoria(id),
              `${inativos} script(s) de “${nome}” ativados.`
            )
          }
        >
          Ativar todos ({inativos})
        </Button>
      )}
      <Dialog open={renomeando} onOpenChange={setRenomeando}>
        <DialogTrigger render={<Button size="sm" variant="outline" disabled={isPending} />}>
          Renomear
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear categoria</DialogTitle>
          </DialogHeader>
          <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} maxLength={40} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenomeando(false)}>
              Cancelar
            </Button>
            <Button
              disabled={isPending || !novoNome.trim()}
              onClick={() =>
                executar(() => renomearCategoria(id, novoNome), "Categoria renomeada.", () =>
                  setRenomeando(false)
                )
              }
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          executar(
            () => alternarCategoriaAtiva(id, !ativo),
            ativo ? "Categoria escondida dos membros." : "Categoria visível para os membros."
          )
        }
      >
        {ativo ? "Esconder" : "Mostrar"}
      </Button>
      <ConfirmarRemocao
        titulo={`Remover a categoria “${nome}”?`}
        descricao={
          totalScripts > 0
            ? `Os ${totalScripts} script(s) dela também serão apagados, junto com o histórico de uso. Para só esconder, use Esconder.`
            : "A categoria está vazia."
        }
        disabled={isPending}
        onConfirm={() => executar(() => removerCategoria(id), "Categoria removida.")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------

export function ScriptDialog({
  categorias,
  script,
  categoriaPadrao,
}: {
  categorias: { id: string; nome: string }[];
  script?: { id: string; categoriaId: string; titulo: string; texto: string; ativo: boolean };
  categoriaPadrao?: string;
}) {
  const [open, setOpen] = useState(false);
  const [categoriaId, setCategoriaId] = useState(
    script?.categoriaId ?? categoriaPadrao ?? categorias[0]?.id ?? ""
  );
  const [titulo, setTitulo] = useState(script?.titulo ?? "");
  const [texto, setTexto] = useState(script?.texto ?? "");
  const [ativo, setAtivo] = useState(script?.ativo ?? true);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const { isPending, executar } = useAcao();

  function inserirVariavel(chave: string) {
    const el = textoRef.current;
    if (!el) return setTexto((t) => t + chave);
    const inicio = el.selectionStart ?? texto.length;
    const fim = el.selectionEnd ?? texto.length;
    const novo = texto.slice(0, inicio) + chave + texto.slice(fim);
    setTexto(novo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(inicio + chave.length, inicio + chave.length);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant={script ? "outline" : "default"} disabled={!categorias.length} />}
      >
        {script ? "Editar" : "Novo script"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{script ? "Editar script" : "Novo script"}</DialogTitle>
          <DialogDescription>
            Use as variáveis para o texto se adaptar a cada membro e contato.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-script">Categoria</Label>
            <select
              id="categoria-script"
              className={selectClass}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo-script">Título</Label>
            <Input
              id="titulo-script"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="texto-script">Texto</Label>
            <div className="flex flex-wrap gap-1">
              {VARIAVEIS.map((v) => (
                <button
                  key={v.chave}
                  type="button"
                  title={v.descricao}
                  onClick={() => inserirVariavel(v.chave)}
                  className="rounded-md border px-1.5 py-0.5 font-mono text-xs text-muted-foreground hover:bg-muted"
                >
                  {v.chave}
                </button>
              ))}
            </div>
            <Textarea
              id="texto-script"
              ref={textoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={2000}
              rows={6}
            />
          </div>
          {texto.trim() && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Prévia (com dados de exemplo)
              </span>
              <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                {aplicarVariaveis(texto, EXEMPLO)}
              </p>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Visível para os membros
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || !titulo.trim() || !texto.trim() || !categoriaId}
            onClick={() =>
              executar(
                () => salvarScript({ id: script?.id, categoriaId, titulo, texto, ativo }),
                script ? "Script salvo." : "Script criado.",
                () => {
                  setOpen(false);
                  if (!script) {
                    setTitulo("");
                    setTexto("");
                  }
                }
              )
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ScriptAcoes({
  id,
  titulo,
  ativo,
  primeiro,
  ultimo,
}: {
  id: string;
  titulo: string;
  ativo: boolean;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const { isPending, executar } = useAcao();
  return (
    <>
      <Setas
        primeiro={primeiro}
        ultimo={ultimo}
        disabled={isPending}
        onMover={(d) => executar(() => moverScript(id, d))}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => executar(() => alternarScriptAtivo(id, !ativo))}
      >
        {ativo ? "Desativar" : "Ativar"}
      </Button>
      <ConfirmarRemocao
        titulo={`Remover “${titulo}”?`}
        descricao="O script e o histórico de uso dele serão apagados. Para só esconder, use Desativar."
        disabled={isPending}
        onConfirm={() => executar(() => removerScript(id), "Script removido.")}
      />
    </>
  );
}
