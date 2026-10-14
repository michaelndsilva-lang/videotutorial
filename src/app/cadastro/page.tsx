import { createAdminClient } from "@/lib/supabase/admin";
import { CadastroForm } from "./cadastro-form";

// ?ref=<codigo_convite>: mostra de quem é o convite e liga o novo membro ao
// patrocinador (ver actions.ts). Código inválido segue como cadastro comum.
export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  let convite: { codigo: string; nome: string } | null = null;
  if (ref && /^[a-f0-9]{8}$/.test(ref)) {
    const admin = createAdminClient();
    const { data: membro } = await admin
      .from("membros")
      .select("usuario_id, status")
      .eq("codigo_convite", ref)
      .maybeSingle();
    if (membro?.status === "ativo") {
      const { data: usuario } = await admin
        .from("usuarios")
        .select("nome_completo")
        .eq("id", membro.usuario_id)
        .single();
      convite = { codigo: ref, nome: usuario?.nome_completo || "um consultor" };
    }
  }
  return <CadastroForm convite={convite} />;
}
