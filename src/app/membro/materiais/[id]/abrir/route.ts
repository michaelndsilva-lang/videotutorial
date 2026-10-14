import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MATERIAIS_BUCKET } from "@/lib/materiais/config";

// Abre (ou baixa, com ?download=1) um material para o membro logado. Gera a
// signed URL na hora do clique com o client do próprio membro: o RLS de
// materiais e a policy do bucket já exigem membro aprovado e material ativo.
export async function GET(request: NextRequest, ctx: RouteContext<"/membro/materiais/[id]/abrir">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "membro") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("materiais")
    .select("arquivo_path, nome_arquivo, video_url, permitir_download")
    .eq("id", id)
    .maybeSingle();
  if (!material) {
    return new NextResponse("Material indisponível.", { status: 404 });
  }

  if (material.video_url) return NextResponse.redirect(material.video_url);
  if (!material.arquivo_path) return new NextResponse("Material indisponível.", { status: 404 });

  const baixar = request.nextUrl.searchParams.get("download") === "1" && material.permitir_download;
  const { data, error } = await supabase.storage
    .from(MATERIAIS_BUCKET)
    .createSignedUrl(material.arquivo_path, 60 * 60, {
      download: baixar ? (material.nome_arquivo ?? true) : false,
    });
  if (error || !data) return new NextResponse("Material indisponível.", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
