import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { carregarConfigSimulador, gerarPropostaPdf } from "@/lib/energia/proposta";
import { UFS } from "@/lib/energia/simulador";

// PDF da proposta gerado pelo próprio membro (simulador interno).
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "membro") return NextResponse.redirect(new URL("/login", request.url));

  const supabase = await createClient();
  const [{ data: membro }, { data: usuario }, { data: perfil }, { data: pagina }] = await Promise.all([
    supabase.from("membros").select("status").eq("usuario_id", user.id).single(),
    supabase.from("usuarios").select("nome_completo").eq("id", user.id).single(),
    supabase.from("perfil_conteudo").select("nome_exibicao, whatsapp").eq("usuario_id", user.id).maybeSingle(),
    supabase.from("paginas").select("whatsapp").eq("membro_id", user.id).maybeSingle(),
  ]);
  if (membro?.status !== "ativo") return new NextResponse("Acesso não liberado.", { status: 403 });

  const sp = request.nextUrl.searchParams;
  const valor = Number(sp.get("valor"));
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1_000_000) {
    return new NextResponse("Informe o valor da conta.", { status: 400 });
  }
  const uf = (UFS as readonly string[]).includes(sp.get("uf") ?? "") ? (sp.get("uf") as string) : "";
  const whatsapp = (pagina?.whatsapp ?? perfil?.whatsapp ?? "").replace(/\D/g, "") || null;

  const bytes = await gerarPropostaPdf({
    valorConta: valor,
    uf,
    cliente: (sp.get("cliente") ?? "").slice(0, 60),
    consultor: { nome: perfil?.nome_exibicao || usuario?.nome_completo || "Consultor(a)", whatsapp },
    config: await carregarConfigSimulador(),
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="proposta-economia-energia.pdf"',
    },
  });
}
