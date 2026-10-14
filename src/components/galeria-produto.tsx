"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function GaleriaProduto({ imagens, nome }: { imagens: string[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  if (imagens.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagens[atual]} alt={nome} className="aspect-square w-full rounded-2xl border object-cover" />
      {imagens.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {imagens.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Foto ${i + 1}`}
              className={cn("shrink-0 overflow-hidden rounded-lg border-2", i === atual ? "border-primary" : "border-transparent")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="size-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
