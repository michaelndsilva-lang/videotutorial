"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLog } from "@/lib/acesso/log";
import { notificarAdmin } from "@/lib/acesso/notificar-admin";

export type CadastroState = { error: string | null; success: boolean };

export async function cadastrar(
  _prevState: CadastroState,
  formData: FormData
): Promise<CadastroState> {
  const nomeCompleto = String(formData.get("nome_completo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!nomeCompleto || !email || !password) {
    return { error: "Preencha todos os campos.", success: false };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres.", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: nomeCompleto } },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Este e-mail já está cadastrado.", success: false };
    }
    return { error: "Não foi possível concluir o cadastro. Tente novamente.", success: false };
  }

  // signUp() só grava em raw_user_meta_data (options.data). O JWT usado pelo
  // proxy.ts/guards para decidir admin x membro lê app_metadata, que só a API
  // admin (service role) pode escrever — sem isso o usuário fica sem role.
  if (data.user) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { role: "membro" },
    });

    // Convite (?ref=): liga ao patrocinador se o código for de um membro aprovado.
    const ref = String(formData.get("ref") ?? "");
    let patrocinador: { id: string; nome: string | null } | null = null;
    if (/^[a-f0-9]{8}$/.test(ref)) {
      const { data: p } = await admin
        .from("membros")
        .select("usuario_id, status")
        .eq("codigo_convite", ref)
        .maybeSingle();
      if (p?.status === "ativo" && p.usuario_id !== data.user.id) {
        const { error: refError } = await admin
          .from("membros")
          .update({ patrocinador_id: p.usuario_id })
          .eq("usuario_id", data.user.id);
        if (refError) console.error("Falha ao ligar patrocinador:", refError);
        else {
          const { data: u } = await admin.from("usuarios").select("nome_completo").eq("id", p.usuario_id).single();
          patrocinador = { id: p.usuario_id, nome: u?.nome_completo ?? null };
        }
      }
    }

    await registrarLog({
      atorId: data.user.id,
      membroId: data.user.id,
      acao: "cadastro",
      detalhes: patrocinador ? { patrocinador_id: patrocinador.id } : undefined,
    });
    await notificarAdmin(
      `📝 ATL Prospect: novo cadastro aguardando aprovação — ${nomeCompleto} (${email})${
        patrocinador ? `, convidado por ${patrocinador.nome ?? "um membro"}` : ""
      }.`,
      "/admin/membros?aba=pendentes"
    );
  }

  return { error: null, success: true };
}
