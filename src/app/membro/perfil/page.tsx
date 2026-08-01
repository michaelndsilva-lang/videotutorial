import { BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { requireMembro } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PlataformaForm } from "./plataforma-form";

export default async function MembroPerfilPage() {
  const user = await requireMembro();
  const supabase = await createClient();

  const { data: membro } = await supabase
    .from("membros")
    .select("link_recrutamento, link_energia")
    .eq("usuario_id", user.id)
    .single();

  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Conta" title="Perfil" description="Seus dados e preferências." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <Avatar size="lg" className="ring-2 ring-amber-500/25">
              <AvatarFallback className="bg-amber-100 font-mono text-base font-semibold text-amber-900 dark:bg-gradient-to-br dark:from-amber-800/50 dark:to-amber-950/60 dark:text-amber-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
              <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="size-3.5 text-amber-600 dark:text-amber-400" />
                Consultor ativo
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plataforma</CardTitle>
            <CardDescription>Seus links pessoais de cadastro.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlataformaForm
              linkRecrutamento={membro?.link_recrutamento ?? ""}
              linkEnergia={membro?.link_energia ?? ""}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
