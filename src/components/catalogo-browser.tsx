"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { precoBRL, type ProdutoResumo } from "@/lib/catalogo/produtos";
import { cn } from "@/lib/utils";

export function CatalogoBrowser({
  produtos,
  categorias,
  hrefBase,
}: {
  produtos: ProdutoResumo[];
  categorias: string[];
  hrefBase: string;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter(
      (p) =>
        (!categoria || p.categoria === categoria) &&
        (!termo || p.nome.toLowerCase().includes(termo) || p.descricaoCurta.toLowerCase().includes(termo))
    );
  }, [produtos, busca, categoria]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto" className="pl-9" aria-label="Buscar produto" />
      </div>
      {categorias.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[null, ...categorias].map((c) => (
            <button
              key={c ?? "todas"}
              type="button"
              onClick={() => setCategoria(c)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                categoria === c ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {c ?? "Todos"}
            </button>
          ))}
        </div>
      )}
      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtrados.map((p) => (
            <li key={p.id}>
              <Link href={`${hrefBase}/${p.id}`} className="group flex h-full flex-col overflow-hidden rounded-xl border transition-colors hover:border-primary/60">
                <div className="relative aspect-square bg-muted">
                  {p.capa && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.capa} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {p.destaque && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Star className="size-3 fill-white" />
                      Destaque
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <span className="text-sm font-medium leading-tight">{p.nome}</span>
                  {p.descricaoCurta && <span className="line-clamp-2 text-xs text-muted-foreground">{p.descricaoCurta}</span>}
                  {p.preco != null && <span className="mt-auto pt-1 text-sm font-semibold tabular-nums">{precoBRL(p.preco)}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
