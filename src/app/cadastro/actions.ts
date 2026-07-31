"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  }

  return { error: null, success: true };
}
