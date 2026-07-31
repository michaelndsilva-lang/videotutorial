"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database.types";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  const role = (data.user.app_metadata as { role?: UserRole } | undefined)?.role;

  if (role === "admin") {
    redirect("/admin/dashboard");
  }
  redirect("/membro/dashboard");
}
