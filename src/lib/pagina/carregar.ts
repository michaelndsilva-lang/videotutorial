import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaginaPublica = {
  membroId: string;
  slug: string;
  nome: string;
  primeiroNome: string;
  fotoUrl: string | null;
  bio: string;
  whatsapp: string | null;
  linkRecrutamento: string | null;
  linkEnergia: string | null;
  linkLoja: string | null;
  mostrarOportunidade: boolean;
  mostrarEnergia: boolean;
  mostrarProdutos: boolean;
};

export function urlFoto(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

// Página só existe para o público se estiver publicada E o membro aprovado.
// cache(): generateMetadata e a página chamam no mesmo request.
export const carregarPaginaPublica = cache(async (slug: string): Promise<PaginaPublica | null> => {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("paginas")
    .select(
      "membro_id, slug, nome_exibicao, foto_path, bio, whatsapp, mostrar_oportunidade, mostrar_energia, mostrar_produtos, publicada"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!p?.publicada) return null;

  const [{ data: membro }, { data: usuario }, { data: perfil }] = await Promise.all([
    admin.from("membros").select("status, link_recrutamento, link_energia, link_loja").eq("usuario_id", p.membro_id).single(),
    admin.from("usuarios").select("nome_completo").eq("id", p.membro_id).single(),
    admin.from("perfil_conteudo").select("nome_exibicao").eq("usuario_id", p.membro_id).maybeSingle(),
  ]);
  if (membro?.status !== "ativo") return null;

  const nome = p.nome_exibicao || perfil?.nome_exibicao || usuario?.nome_completo || "Consultor(a) Atlântica Natural";
  return {
    membroId: p.membro_id,
    slug: p.slug,
    nome,
    primeiroNome: nome.split(/\s+/)[0],
    fotoUrl: urlFoto(p.foto_path),
    bio: p.bio,
    whatsapp: p.whatsapp,
    linkRecrutamento: membro.link_recrutamento,
    linkEnergia: membro.link_energia,
    linkLoja: membro.link_loja,
    mostrarOportunidade: p.mostrar_oportunidade,
    mostrarEnergia: p.mostrar_energia,
    mostrarProdutos: p.mostrar_produtos,
  };
});
