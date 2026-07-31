"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EsqueciSenhaState = { error: string | null; success: boolean };

export async function solicitarRecuperacaoSenha(
  _prevState: EsqueciSenhaState,
  formData: FormData
): Promise<EsqueciSenhaState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Informe seu e-mail.", success: false };
  }

  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "https"}://${headerList.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/redefinir-senha`,
  });

  // Sempre retorna sucesso, exista ou não o e-mail — evita expor quais
  // e-mails estão cadastrados na plataforma.
  return { error: null, success: true };
}
