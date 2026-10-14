"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Star, X } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import {
  IMAGEM_PRODUTO_MAX,
  MAX_IMAGENS,
  PRODUTOS_BUCKET,
  urlImagemProduto,
} from "@/lib/catalogo/produtos";
import { lerValor } from "@/lib/energia/simulador";
import { cn } from "@/lib/utils";
import {
  alternarCategoriaProduto,
  alternarProduto,
  criarCategoriaProduto,
  moverCategoriaProduto,
  moverProduto,
  removerCategoriaProduto,
  removerProduto,
  renomearCategoriaProduto,
  salvarProduto,
} from "./actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

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
      <Button size="icon-sm" variant="ghost" aria-label="Mover para cima" disabled={disabled || primeiro} onClick={() => onMover("cima")}>
        <ArrowUp className="size-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Mover para baixo" disabled={disabled || ultimo} onClick={() => onMover("baixo")}>
        <ArrowDown className="size-4" />
      </Button>
    </>
  );
}

function Confirmar({ titulo, descricao, onConfirm, disabled }: { titulo: string; descricao: string; onConfirm: () => void; disabled?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive" disabled={disabled}>Remover</Button>} />
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

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export function NovaCategoriaProduto() {
  const [nome, setNome] = useState("");
  const { isPending, executar } = useAcao();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => criarCategoriaProduto(nome), "Categoria criada.", () => setNome(""));
      }}
    >
      <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova categoria" maxLength={40} className="h-8 w-44" aria-label="Nome da nova categoria" />
      <Button size="sm" variant="outline" type="submit" disabled={isPending || !nome.trim()}>
        <Plus className="size-4" />
        Categoria
      </Button>
    </form>
  );
}

export function CategoriaProdutoAcoes({
  id,
  nome,
  ativo,
  primeiro,
  ultimo,
}: {
  id: string;
  nome: string;
  ativo: boolean;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const { isPending, executar } = useAcao();
  const [aberto, setAberto] = useState(false);
  const [novoNome, setNovoNome] = useState(nome);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Setas primeiro={primeiro} ultimo={ultimo} disabled={isPending} onMover={(d) => executar(() => moverCategoriaProduto(id, d))} />
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogTrigger render={<Button size="sm" variant="outline" disabled={isPending} />}>Renomear</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear categoria</DialogTitle>
          </DialogHeader>
          <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} maxLength={40} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button disabled={isPending || !novoNome.trim()} onClick={() => executar(() => renomearCategoriaProduto(id, novoNome), "Categoria renomeada.", () => setAberto(false))}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => executar(() => alternarCategoriaProduto(id, !ativo))}>
        {ativo ? "Esconder" : "Mostrar"}
      </Button>
      <Confirmar
        titulo={`Remover a categoria “${nome}”?`}
        descricao="Só é possível remover categorias sem produtos."
        disabled={isPending}
        onConfirm={() => executar(() => removerCategoriaProduto(id), "Categoria removida.")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Produto
// ---------------------------------------------------------------------------

export type ProdutoForm = {
  id: string;
  categoriaId: string;
  nome: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  beneficios: string[];
  modoDeUso: string;
  imagens: string[];
  precoReferencia: number | null;
  destaque: boolean;
  ativo: boolean;
  scriptIds: string[];
};

export function ProdutoDialog({
  categorias,
  scripts,
  produto,
  categoriaPadrao,
}: {
  categorias: { id: string; nome: string }[];
  scripts: { id: string; titulo: string; categoria: string }[];
  produto?: ProdutoForm;
  categoriaPadrao?: string;
}) {
  const [open, setOpen] = useState(false);
  const [categoriaId, setCategoriaId] = useState(produto?.categoriaId ?? categoriaPadrao ?? categorias[0]?.id ?? "");
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [curta, setCurta] = useState(produto?.descricaoCurta ?? "");
  const [completa, setCompleta] = useState(produto?.descricaoCompleta ?? "");
  const [beneficios, setBeneficios] = useState((produto?.beneficios ?? []).join("\n"));
  const [modoDeUso, setModoDeUso] = useState(produto?.modoDeUso ?? "");
  const [imagens, setImagens] = useState<string[]>(produto?.imagens ?? []);
  const [preco, setPreco] = useState(produto?.precoReferencia != null ? String(produto.precoReferencia).replace(".", ",") : "");
  const [destaque, setDestaque] = useState(produto?.destaque ?? false);
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [scriptIds, setScriptIds] = useState<string[]>(produto?.scriptIds ?? []);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Fotos enviadas nesta edição e ainda não salvas: apagadas se cancelar.
  const enviadasRef = useRef<string[]>([]);
  const { isPending, executar } = useAcao();

  function fechar(v: boolean) {
    if (enviando) return;
    if (!v && enviadasRef.current.length) {
      void createClient().storage.from(PRODUTOS_BUCKET).remove(enviadasRef.current);
      enviadasRef.current = [];
      setImagens(produto?.imagens ?? []);
    }
    setOpen(v);
  }

  async function enviarImagens(files: FileList | null) {
    if (inputRef.current) inputRef.current.value = "";
    if (!files?.length) return;
    const lista = Array.from(files).slice(0, MAX_IMAGENS - imagens.length);
    if (!lista.length) return toast.error(`No máximo ${MAX_IMAGENS} imagens.`);
    setEnviando(true);
    const supabase = createClient();
    const novas: string[] = [];
    for (const f of lista) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        toast.error(`${f.name}: use JPG, PNG ou WEBP.`);
        continue;
      }
      if (f.size > IMAGEM_PRODUTO_MAX) {
        toast.error(`${f.name}: acima de 5 MB.`);
        continue;
      }
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(PRODUTOS_BUCKET).upload(path, f, { contentType: f.type });
      if (error) toast.error(`${f.name}: ${error.message}`);
      else novas.push(path);
    }
    enviadasRef.current.push(...novas);
    setImagens((atual) => [...atual, ...novas]);
    setEnviando(false);
  }

  function salvar() {
    executar(
      () =>
        salvarProduto({
          id: produto?.id,
          categoriaId,
          nome,
          descricaoCurta: curta,
          descricaoCompleta: completa,
          beneficios: beneficios.split("\n"),
          modoDeUso,
          imagens,
          precoReferencia: preco.trim() ? lerValor(preco) : null,
          destaque,
          ativo,
          scriptIds,
        }),
      produto ? "Produto salvo." : "Produto criado.",
      () => {
        enviadasRef.current = [];
        setOpen(false);
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogTrigger render={<Button size="sm" variant={produto ? "outline" : "default"} disabled={!categorias.length} />}>
        {produto ? "Editar" : "Novo produto"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            Nunca diga que um produto cura, trata ou previne doenças. Use benefícios cosméticos e de bem-estar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome-prod">Nome</Label>
              <Input id="nome-prod" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-prod">Categoria</Label>
              <select id="cat-prod" className={selectClass} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Imagens (a primeira é a capa)</Label>
            <div className="flex flex-wrap gap-2">
              {imagens.map((img, i) => (
                <div key={img} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlImagemProduto(img) ?? ""} alt="" className={cn("size-20 rounded-lg border object-cover", i === 0 && "ring-2 ring-primary")} />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between p-0.5">
                    {i > 0 ? (
                      <button type="button" title="Usar como capa" className="rounded bg-black/60 p-0.5 text-white" onClick={() => setImagens((a) => [img, ...a.filter((x) => x !== img)])}>
                        <Star className="size-3" />
                      </button>
                    ) : <span />}
                    <button type="button" title="Remover" className="rounded bg-black/60 p-0.5 text-white" onClick={() => setImagens((a) => a.filter((x) => x !== img))}>
                      <X className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
              {imagens.length < MAX_IMAGENS && (
                <button type="button" onClick={() => inputRef.current?.click()} disabled={enviando} className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted">
                  {enviando ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  Adicionar
                </button>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => enviarImagens(e.target.files)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="curta">Descrição curta (aparece no card)</Label>
            <Input id="curta" value={curta} onChange={(e) => setCurta(e.target.value)} maxLength={200} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="completa">Descrição completa</Label>
            <Textarea id="completa" value={completa} onChange={(e) => setCompleta(e.target.value)} maxLength={4000} rows={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="beneficios">Benefícios (um por linha)</Label>
            <Textarea id="beneficios" value={beneficios} onChange={(e) => setBeneficios(e.target.value)} rows={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="uso">Modo de uso</Label>
            <Textarea id="uso" value={modoDeUso} onChange={(e) => setModoDeUso(e.target.value)} maxLength={2000} rows={3} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preco">Preço de referência (opcional)</Label>
            <Input id="preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="R$ 79,90" className="w-40" />
          </div>

          {scripts.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-sm font-medium">Scripts de venda deste produto</legend>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border p-2 text-sm">
                {scripts.map((s) => (
                  <label key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={scriptIds.includes(s.id)}
                      onChange={(e) => setScriptIds((a) => (e.target.checked ? [...a, s.id] : a.filter((x) => x !== s.id)))}
                    />
                    <span className="truncate">{s.titulo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{s.categoria}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-primary" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} />
              Destaque (aparece primeiro na página pessoal)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-primary" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Visível para os membros
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => fechar(false)} disabled={isPending || enviando}>Cancelar</Button>
          <Button onClick={salvar} disabled={isPending || enviando || !nome.trim() || !categoriaId}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProdutoAcoes({
  id,
  nome,
  ativo,
  destaque,
  primeiro,
  ultimo,
}: {
  id: string;
  nome: string;
  ativo: boolean;
  destaque: boolean;
  primeiro: boolean;
  ultimo: boolean;
}) {
  const { isPending, executar } = useAcao();
  return (
    <>
      <Setas primeiro={primeiro} ultimo={ultimo} disabled={isPending} onMover={(d) => executar(() => moverProduto(id, d))} />
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => executar(() => alternarProduto(id, "destaque", !destaque))}>
        <Star className={cn("size-4", destaque && "fill-amber-500 text-amber-500")} />
        {destaque ? "Destaque" : "Destacar"}
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => executar(() => alternarProduto(id, "ativo", !ativo))}>
        {ativo ? "Esconder" : "Mostrar"}
      </Button>
      <Confirmar
        titulo={`Remover “${nome}”?`}
        descricao="Apaga o produto, as fotos e o histórico de cliques. Para só esconder, use Esconder."
        disabled={isPending}
        onConfirm={() => executar(() => removerProduto(id), "Produto removido.")}
      />
    </>
  );
}
