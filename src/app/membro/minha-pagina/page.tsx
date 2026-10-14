import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-config";
import { urlFoto } from "@/lib/pagina/carregar";
import { PaginaEditor, type PaginaInicial } from "./pagina-editor";

function sugerirSlug(nome: string) {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "minha-pagina"
  );
}

export default async function MinhaPaginaPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  const [{ data: pagina }, { data: usuario }, { data: perfil }, { count: leads }] = await Promise.all([
    supabase.from("paginas").select("*").eq("membro_id", user.id).maybeSingle(),
    supabase.from("usuarios").select("nome_completo").eq("id", user.id).single(),
    supabase.from("perfil_conteudo").select("nome_exibicao, whatsapp").eq("usuario_id", user.id).maybeSingle(),
    supabase
      .from("lead_consentimentos")
      .select("id", { count: "exact", head: true })
      .eq("membro_id", user.id)
      .eq("origem", "pagina"),
  ]);

  const nome = perfil?.nome_exibicao || usuario?.nome_completo || user.email?.split("@")[0] || "";
  const inicial: PaginaInicial = {
    slug: pagina?.slug ?? sugerirSlug(nome),
    bio: pagina?.bio ?? "",
    whatsapp: pagina?.whatsapp ?? perfil?.whatsapp ?? "",
    fotoPath: pagina?.foto_path ?? null,
    fotoUrl: urlFoto(pagina?.foto_path ?? null),
    mostrarOportunidade: pagina?.mostrar_oportunidade ?? true,
    mostrarEnergia: pagina?.mostrar_energia ?? true,
    mostrarProdutos: pagina?.mostrar_produtos ?? true,
    publicada: pagina?.publicada ?? false,
    existe: !!pagina,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Divulgação"
        title="Minha página"
        description="Sua página pessoal para divulgar no Instagram e no WhatsApp. Quem deixar o contato cai direto no seu Kanban."
      />
      {pagina && (
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            <span className="text-2xl font-semibold tabular-nums">{pagina.visitas}</span>{" "}
            <span className="text-muted-foreground">visitas</span>
          </span>
          <span>
            <span className="text-2xl font-semibold tabular-nums">{leads ?? 0}</span>{" "}
            <span className="text-muted-foreground">contatos pela página</span>
          </span>
        </div>
      )}
      <PaginaEditor
        userId={user.id}
        inicial={inicial}
        siteUrl={SITE_URL}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      />
    </div>
  );
}
