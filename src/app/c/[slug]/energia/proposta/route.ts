import { NextResponse, type NextRequest } from "next/server";
import { carregarPaginaPublica } from "@/lib/pagina/carregar";
import { carregarConfigSimulador, gerarPropostaPdf } from "@/lib/energia/proposta";
import { UFS } from "@/lib/energia/simulador";

// PDF da proposta com os dados do consultor dono da página.
export async function GET(request: NextRequest, ctx: RouteContext<"/c/[slug]/energia/proposta">) {
  const { slug } = await ctx.params;
  const pagina = await carregarPaginaPublica(slug);
  if (!pagina?.mostrarEnergia) return new NextResponse("Página indisponível.", { status: 404 });

  const sp = request.nextUrl.searchParams;
  const valor = Number(sp.get("valor"));
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1_000_000) {
    return new NextResponse("Informe o valor da conta.", { status: 400 });
  }
  const uf = (UFS as readonly string[]).includes(sp.get("uf") ?? "") ? (sp.get("uf") as string) : "";

  const bytes = await gerarPropostaPdf({
    valorConta: valor,
    uf,
    cliente: (sp.get("cliente") ?? "").slice(0, 60),
    consultor: { nome: pagina.nome, whatsapp: pagina.whatsapp },
    config: await carregarConfigSimulador(),
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="proposta-economia-energia.pdf"',
      "X-Robots-Tag": "noindex",
    },
  });
}
