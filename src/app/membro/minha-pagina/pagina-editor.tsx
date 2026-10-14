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
import { salvarPagina } from "./actions";

const FOTO_MAX = 2 * 1024 * 1024;

export type PaginaInicial = {
  slug: string;
  bio: string;
  whatsapp: string;
  fotoPath: string | null;
  fotoUrl: string | null;
  mostrarOportunidade: boolean;
  mostrarEnergia: boolean;
  mostrarProdutos: boolean;
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
  const [bio, setBio] = useState(inicial.bio);
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp);
  const [fotoPath, setFotoPath] = useState(inicial.fotoPath);
  const [fotoUrl, setFotoUrl] = useState(inicial.fotoUrl);
  const [oportunidade, setOportunidade] = useState(inicial.mostrarOportunidade);
  const [energia, setEnergia] = useState(inicial.mostrarEnergia);
  const [produtos, setProdutos] = useState(inicial.mostrarProdutos);
  const [publicada, setPublicada] = useState(inicial.publicada);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const urlPublica = `${siteUrl}/c/${inicial.slug}`;

  async function trocarFoto(file: File | null) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Use uma foto JPG, PNG ou WEBP.");
    }
    if (file.size > FOTO_MAX) return toast.error("A foto pode ter até 2 MB.");
    setEnviandoFoto(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/foto-${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      setFotoPath(path);
      setFotoUrl(`${supabaseUrl}/storage/v1/object/public/avatars/${path}`);
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
          bio,
          whatsapp,
          fotoPath,
          mostrarOportunidade: oportunidade,
          mostrarEnergia: energia,
          mostrarProdutos: produtos,
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
            onChange={(e) => trocarFoto(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={enviandoFoto}>
            {enviandoFoto ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {fotoUrl ? "Trocar foto" : "Enviar foto"}
          </Button>
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
            rows={3}
            placeholder="Ex.: Mãe, empreendedora e consultora Atlântica Natural há 2 anos. Te ajudo a ter uma renda extra e economizar na conta de luz."
          />
          <span className="text-xs text-muted-foreground tabular-nums">{bio.length}/400</span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="whats">Seu WhatsApp (aparece como botão na página)</Label>
          <Input
            id="whats"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            placeholder="(84) 99999-9999"
            className="w-60"
          />
        </div>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">O que aparece na página</legend>
          {[
            ["Oportunidade de negócio (com seu link de cadastro)", oportunidade, setOportunidade],
            ["Economia na conta de luz (energia)", energia, setEnergia],
            ["Produtos", produtos, setProdutos],
          ].map(([label, valor, set]) => (
            <label key={label as string} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={valor as boolean}
                onChange={(e) => (set as (v: boolean) => void)(e.target.checked)}
              />
              {label as string}
            </label>
          ))}
        </fieldset>

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
