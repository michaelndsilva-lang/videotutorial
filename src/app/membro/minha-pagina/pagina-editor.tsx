"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Copy, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { APRESENTACAO_PADRAO } from "@/lib/pagina/apresentacao";
import { salvarPagina } from "./actions";
import { FotoRecorte } from "./foto-recorte";

// A foto original pode ser grande: o recorte gera um JPG 640x640 leve.
const FOTO_MAX = 15 * 1024 * 1024;

export type PaginaInicial = {
  slug: string;
  nome: string;
  bio: string;
  whatsapp: string;
  fotoPath: string | null;
  fotoUrl: string | null;
  publicada: boolean;
  existe: boolean;
};

export function PaginaEditor({
  userId,
  inicial,
  siteUrl,
  supabaseUrl,
}: {
  userId: string;
  inicial: PaginaInicial;
  siteUrl: string;
  supabaseUrl: string;
}) {
  const [slug, setSlug] = useState(inicial.slug);
  const [nome, setNome] = useState(inicial.nome);
  const [bio, setBio] = useState(inicial.bio);
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp);
  const [fotoPath, setFotoPath] = useState(inicial.fotoPath);
  const [fotoUrl, setFotoUrl] = useState(inicial.fotoUrl);
  const [publicada, setPublicada] = useState(inicial.publicada);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [recortando, setRecortando] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const urlPublica = `${siteUrl}/c/${inicial.slug}`;

  function escolherFoto(file: File | null) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Use uma foto JPG, PNG ou WEBP.");
    }
    if (file.size > FOTO_MAX) return toast.error("A foto pode ter até 15 MB.");
    setRecortando(file);
  }

  // Recebe a foto já enquadrada (JPG quadrado) e envia ao storage.
  async function enviarFoto(file: File) {
    setEnviandoFoto(true);
    try {
      const path = `${userId}/foto-${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      setFotoPath(path);
      setFotoUrl(`${supabaseUrl}/storage/v1/object/public/avatars/${path}`);
      setRecortando(null);
      toast.success("Foto carregada. Clique em Salvar para usar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  function salvar() {
    startTransition(async () => {
      try {
        await salvarPagina({
          slug,
          nome,
          bio,
          whatsapp,
          fotoPath,
          publicada,
        });
        toast.success(publicada ? "Página salva e publicada!" : "Página salva (não publicada).");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="Sua foto" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Camera className="size-6" />
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => escolherFoto(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={enviandoFoto}>
            {enviandoFoto ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {fotoUrl ? "Trocar foto" : "Enviar foto"}
          </Button>
        </div>

        {recortando && (
          <FotoRecorte
            key={`${recortando.name}-${recortando.lastModified}-${recortando.size}`}
            arquivo={recortando}
            onCancelar={() => setRecortando(null)}
            onConfirmar={enviarFoto}
          />
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome na página</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
            autoComplete="name"
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">Aparece em destaque abaixo da sua foto.</span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="slug">Endereço da página</Label>
          <div className="flex items-center rounded-lg border focus-within:ring-3 focus-within:ring-ring/50">
            <span className="pl-3 text-sm text-muted-foreground">atlprospect.com/c/</span>
            <input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              maxLength={40}
              className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">Apresentação curta</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={400}
            rows={6}
            placeholder={APRESENTACAO_PADRAO}
          />
          <span className="text-xs text-muted-foreground">
            <span className="tabular-nums">{bio.length}/400</span>. Deixe uma linha em branco para separar
            parágrafos. Vazio, a página usa o texto de exemplo acima.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="whats">Seu WhatsApp</Label>
          <Input
            id="whats"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            placeholder="(84) 99999-9999"
            className="w-60"
          />
        </div>

        <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={publicada}
            onChange={(e) => setPublicada(e.target.checked)}
          />
          <span>
            <span className="font-medium">Página publicada</span>
            <span className="block text-xs text-muted-foreground">
              Desmarcado, o link mostra “página não encontrada”.
            </span>
          </span>
        </label>

        <Button className="w-fit" onClick={salvar} disabled={isPending || enviandoFoto}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </Button>
      </div>

      <aside className="flex h-fit flex-col gap-3 rounded-xl border p-4">
        <span className="text-sm font-medium">Seu link</span>
        {inicial.existe && inicial.publicada ? (
          <>
            <p className="text-sm break-all text-muted-foreground">{urlPublica}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(urlPublica);
                    toast.success("Link copiado!");
                  } catch {
                    toast.error("Não foi possível copiar.");
                  }
                }}
              >
                <Copy className="size-4" />
                Copiar
              </Button>
              <a href={urlPublica} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                <ExternalLink className="size-4" />
                Abrir
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Conheça meu trabalho com a Atlântica Natural: ${urlPublica}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm" })}
              >
                <MessageCircle className="size-4" />
                Divulgar
              </a>
            </div>
            <p className="text-xs text-muted-foreground">Coloque esse link na bio do Instagram e no status do WhatsApp.</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Salve com “Página publicada” marcado para ganhar seu link.</p>
        )}
      </aside>
    </div>
  );
}
