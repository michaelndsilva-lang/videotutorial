"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

// Player do YouTube com a IFrame API: igual ao YoutubeFacade (só a capa até o
// clique), mas avisa quando o vídeo termina (onEnded) — usado para marcar a
// aula como assistida automaticamente. Para trocar de vídeo, renderize com
// key={videoId} (o estado "tocando" volta para a capa).

type YTPlayer = { destroy: () => void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number>;
      events?: { onStateChange?: (e: { data: number }) => void };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function carregarApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function YoutubePlayer({
  videoId,
  title,
  onEnded,
  className,
}: {
  videoId: string;
  title: string;
  onEnded?: () => void;
  className?: string;
}) {
  const [tocando, setTocando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const container = containerRef.current;
    if (!tocando || !container) return;
    let player: YTPlayer | null = null;
    let cancelado = false;
    // A IFrame API troca o alvo por um <iframe>: criamos o alvo fora do React
    // para o React nunca tentar mexer num nó que não é mais dele.
    const alvo = document.createElement("div");
    container.appendChild(alvo);

    carregarApi().then((YT) => {
      if (cancelado) return;
      player = new YT.Player(alvo, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) onEndedRef.current?.();
          },
        },
      });
    });

    return () => {
      cancelado = true;
      player?.destroy();
      container.replaceChildren();
    };
  }, [tocando, videoId]);

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10",
        className
      )}
    >
      {tocando ? (
        <div
          ref={containerRef}
          title={title}
          className="absolute inset-0 [&>*]:h-full [&>*]:w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setTocando(true)}
          className="group absolute inset-0 h-full w-full cursor-pointer"
          aria-label={`Assistir: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/45" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_0_10px_rgba(255,255,255,0.12)] transition-transform group-hover:scale-110 sm:size-16">
              <Play className="size-6 translate-x-0.5 fill-black text-black" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
