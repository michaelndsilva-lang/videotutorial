"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Enquadramento da foto antes do envio: arrastar para posicionar e zoom no
// controle deslizante (ou setas do teclado). Gera um JPG quadrado 640x640,
// que a página mostra em círculo.

const VISOR = 256; // lado do visor, em px
const SAIDA = 640; // lado da foto final, em px

export function FotoRecorte({
  arquivo,
  onCancelar,
  onConfirmar,
}: {
  arquivo: File;
  onCancelar: () => void;
  onConfirmar: (foto: File) => Promise<void>;
}) {
  // O pai monta este componente com key por arquivo: estado sempre zerado.
  const [url] = useState(() => URL.createObjectURL(arquivo));
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [bruto, setBruto] = useState({ x: 0, y: 0 });
  const [salvando, setSalvando] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const arrasto = useRef<{
    px: number;
    py: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // Escala "cobrir": o menor lado da foto ocupa o visor inteiro.
  const escala = dim ? (VISOR / Math.min(dim.w, dim.h)) * zoom : 1;
  const largura = dim ? dim.w * escala : VISOR;
  const altura = dim ? dim.h * escala : VISOR;

  function limitar(p: { x: number; y: number }) {
    const mx = (largura - VISOR) / 2;
    const my = (altura - VISOR) / 2;
    return {
      x: Math.max(-mx, Math.min(mx, p.x)),
      y: Math.max(-my, Math.min(my, p.y)),
    };
  }
  // Limitado a cada render: ao diminuir o zoom a foto continua cobrindo o visor.
  const pos = limitar(bruto);
  const setPos = (p: { x: number; y: number }) => setBruto(limitar(p));

  async function confirmar() {
    const img = imgRef.current;
    if (!img || !dim) return;
    setSalvando(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SAIDA;
      canvas.height = SAIDA;
      const ctx = canvas.getContext("2d")!;
      const lado = VISOR / escala;
      const sx = (largura / 2 - VISOR / 2 - pos.x) / escala;
      const sy = (altura / 2 - VISOR / 2 - pos.y) / escala;
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, SAIDA, SAIDA);
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Não foi possível preparar a foto.");
      await onConfirmar(new File([blob], "foto.jpg", { type: "image/jpeg" }));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(aberto) => !aberto && !salvando && onCancelar()}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
          <DialogDescription>
            Arraste para posicionar e use o zoom para enquadrar o rosto.
          </DialogDescription>
        </DialogHeader>

        <div
          role="application"
          aria-label="Área de enquadramento. Use as setas para mover a foto."
          tabIndex={0}
          className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
          style={{ width: VISOR, height: VISOR }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            arrasto.current = {
              px: e.clientX,
              py: e.clientY,
              x: pos.x,
              y: pos.y,
            };
          }}
          onPointerMove={(e) => {
            const a = arrasto.current;
            if (a)
              setPos({ x: a.x + e.clientX - a.px, y: a.y + e.clientY - a.py });
          }}
          onPointerUp={() => (arrasto.current = null)}
          onPointerCancel={() => (arrasto.current = null)}
          onKeyDown={(e) => {
            const passo = e.shiftKey ? 20 : 6;
            const d = {
              ArrowLeft: [passo, 0],
              ArrowRight: [-passo, 0],
              ArrowUp: [0, passo],
              ArrowDown: [0, -passo],
            }[e.key];
            if (!d) return;
            e.preventDefault();
            setPos({ x: pos.x + d[0], y: pos.y + d[1] });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setDim({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
            style={{
              visibility: dim ? "visible" : "hidden",
              width: largura,
              height: altura,
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            }}
          />
          {/* Máscara circular: mostra como a foto aparece na página. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 999px rgb(0 0 0 / 0.55)" }}
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="w-10 text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!dim || salvando}>
            {salvando && <Loader2 className="size-4 animate-spin" />}
            Usar esta foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
