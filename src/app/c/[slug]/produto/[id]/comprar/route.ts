import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { carregarProdutoPublico } from "@/lib/catalogo/publico";

// "Comprar": registra o clique (produto + membro) e manda para o link da loja
// do membro. Sem link da loja, abre o WhatsApp do membro falando do produto.
export async function GET(request: NextRequest, ctx: RouteContext<"/c/[slug]/produto/[id]/comprar">) {
  const { slug, id } = await ctx.params;
  const pagina = await carregarPaginaPublica(slug);
  const produto = pagina?.mostrarProdutos ? await carregarProdutoPublico(id) : null;
  if (!pagina || !produto) return NextResponse.redirect(new URL(`/c/${slug}`, request.url));

  const { error } = await createAdminClient()
    .from("produto_cliques")
    .insert({ produto_id: produto.id, membro_id: pagina.membroId });
  if (error) console.error("Falha ao registrar clique em Comprar:", error);

  if (pagina.linkLoja) return NextResponse.redirect(pagina.linkLoja);
  if (pagina.whatsapp) {
    const texto = `Oi, ${pagina.primeiroNome}! Quero comprar: ${produto.nome}.`;
    return NextResponse.redirect(`https://wa.me/${pagina.whatsapp}?text=${encodeURIComponent(texto)}`);
  }
  return NextResponse.redirect(new URL(`/c/${slug}/produto/${id}#contato`, request.url));
}
