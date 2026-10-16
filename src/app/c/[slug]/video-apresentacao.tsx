"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

// Vídeo da apresentação de negócio sem a interface do YouTube: só o nosso
// botão de play. Como funciona:
// - controls=0 tira a barra; o iframe é mais alto que a moldura e fica
//   centralizado, então o título (topo) e a marca (rodapé) do YouTube caem na
//   faixa preta cortada pelo overflow-hidden;
// - durante a reprodução uma camada transparente cobre o iframe: clicar pausa;
// - pausado ou no fim, a nossa capa volta por cima (esconde as sugestões).
// O player é criado quando o vídeo chega perto da tela, para o play responder
// no primeiro toque (o iPhone exige que o play venha do gesto do usuário).

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

// Sem "declare global": o youtube-player.tsx já declara window.YT com outro tipo.
type JanelaYT = { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

let apiPromise: Promise<YTNamespace> | null = null;
function carregarApi(): Promise<YTNamespace> {
  const w = window as unknown as JanelaYT;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const anterior = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      anterior?.();
      if (w.YT) resolve(w.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

type Estado = "capa" | "carregando" | "tocando" | "pausado" | "fim";

export function VideoApresentacao({
  videoId,
  capa,
  titulo,
  ctaHref,
}: {
  videoId: string;
  capa: string;
  titulo: string;
  ctaHref: string;
}) {
  const [estado, setEstado] = useState<Estado>("capa");
  const molduraRef = useRef<HTMLDivElement>(null);
  const alvoRef = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const pronto = useRef(false);
  const tocarQuandoPronto = useRef(false);

  useEffect(() => {
    const moldura = molduraRef.current;
    const host = alvoRef.current;
    if (!moldura || !host) return;
    let cancelado = false;

    function criar() {
      carregarApi().then((YT) => {
        if (cancelado || player.current) return;
        // Alvo fora do React: a API troca este nó por um <iframe>.
        const alvo = document.createElement("div");
        host!.appendChild(alvo);
        player.current = new YT.Player(alvo, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            cc_load_policy: 0,
          },
          events: {
            onReady: () => {
              pronto.current = true;
              if (tocarQuandoPronto.current) player.current?.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) setEstado("tocando");
              else if (e.data === YT.PlayerState.PAUSED) setEstado("pausado");
              else if (e.data === YT.PlayerState.ENDED) setEstado("fim");
            },
          },
        });
      });
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          obs.disconnect();
          criar();
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(moldura);

    return () => {
      cancelado = true;
      obs.disconnect();
      player.current?.destroy();
      player.current = null;
      pronto.current = false;
      host.replaceChildren();
    };
  }, [videoId]);

  function tocar() {
    if (estado === "fim") player.current?.seekTo(0, true);
    if (pronto.current) player.current?.playVideo();
    else tocarQuandoPronto.current = true;
    setEstado((e) => (e === "capa" || !pronto.current ? "carregando" : e));
  }

  const mostrarCapa = estado !== "tocando";

  return (
    <div
      ref={molduraRef}
      className="captura-video relative aspect-video w-full overflow-hidden rounded-[18px] bg-black"
    >
      {/* iframe 120px mais alto que a moldura: título e marca ficam fora. */}
      <div
        ref={alvoRef}
        aria-hidden={estado === "capa"}
        className="pointer-events-none absolute inset-x-0 -top-[60px] h-[calc(100%+120px)] [&>iframe]:h-full [&>iframe]:w-full"
      />

      {estado === "tocando" && (
        <button
          type="button"
          onClick={() => player.current?.pauseVideo()}
          className="absolute inset-0 cursor-pointer"
          aria-label="Pausar vídeo"
        />
      )}

      {mostrarCapa && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capa} alt="" width={1280} height={720} className="h-full w-full object-cover" />
          <div className={estado === "pausado" ? "absolute inset-0 bg-black/45" : "absolute inset-0 bg-black/20"} />
          {estado === "fim" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-center">
              <p className="captura-serif text-2xl font-semibold text-[var(--an-text)] sm:text-3xl">
                Gostou do que viu?
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a href={ctaHref} className="bio-botao px-6">
                  QUERO FAZER PARTE
                </a>
                <button
                  type="button"
                  onClick={tocar}
                  className="rounded-xl px-4 py-3 text-sm text-[var(--an-muted)] underline underline-offset-4 hover:text-[var(--an-text)]"
                >
                  Assistir de novo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={tocar}
              className="group absolute inset-0 flex cursor-pointer items-center justify-center"
              aria-label={estado === "pausado" ? `Continuar: ${titulo}` : `Assistir: ${titulo}`}
            >
              <span className="captura-play flex size-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95 sm:size-24">
                {estado === "carregando" ? (
                  <span className="size-8 animate-spin rounded-full border-[3px] border-[#17120a]/30 border-t-[#17120a]" />
                ) : (
                  <Play className="size-7 translate-x-0.5 fill-[#17120a] text-[#17120a] sm:size-9" />
                )}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
