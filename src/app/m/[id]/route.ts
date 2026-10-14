import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATERIAIS_BUCKET } from "@/lib/materiais/config";

// Link público de um material (atlprospect.com/m/<id>), que o membro manda ao
// lead no WhatsApp. Não expira: a cada acesso gera uma signed URL nova. Só
// funciona para material ativo e marcado como compartilhável pelo admin.
export async function GET(_request: NextRequest, ctx: RouteContext<"/m/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return indisponivel();

  const admin = createAdminClient();
  const { data: material } = await admin
    .from("materiais")
    .select("arquivo_path, video_url, ativo, compartilhavel")
    .eq("id", id)
    .maybeSingle();
  if (!material?.ativo || !material.compartilhavel) return indisponivel();

  if (material.video_url) return NextResponse.redirect(material.video_url);
  if (!material.arquivo_path) return indisponivel();

  const { data, error } = await admin.storage
    .from(MATERIAIS_BUCKET)
    .createSignedUrl(material.arquivo_path, 60 * 60);
  if (error || !data) return indisponivel();

  return NextResponse.redirect(data.signedUrl);
}

function indisponivel() {
  return new NextResponse(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Material indisponível</title><body style='font-family:system-ui;padding:2rem;text-align:center'><h1 style='font-size:1.25rem'>Material indisponível</h1><p>Este link não está mais ativo. Peça um novo para quem te enviou.</p></body>",
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
