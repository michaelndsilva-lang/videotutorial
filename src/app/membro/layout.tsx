import { requireMembro } from "@/lib/auth/guards";
import { signOut } from "@/lib/auth/actions";
import { NavShell } from "@/components/nav-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import type { MembroStatus } from "@/lib/types/database.types";

const BLOQUEIO: Record<Exclude<MembroStatus, "ativo">, { titulo: string; mensagem: string }> = {
  pendente: {
    titulo: "Seu cadastro está em análise",
    mensagem:
      "Recebemos seu cadastro! Assim que o administrador aprovar, você recebe acesso completo à plataforma.",
  },
  recusado: {
    titulo: "Acesso não aprovado",
    mensagem:
      "Seu cadastro não foi aprovado. Se acha que isso é um engano, fale com seu líder.",
  },
  suspenso: {
    titulo: "Acesso suspenso",
    mensagem:
      "Seu acesso foi suspenso pelo administrador. Seus dados continuam guardados. Fale com seu líder para entender o motivo.",
  },
  inativo: {
    titulo: "Acesso suspenso",
    mensagem:
      "Seu acesso foi suspenso pelo administrador. Seus dados continuam guardados. Fale com seu líder para entender o motivo.",
  },
};

export default async function MembroLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMembro();

  if (user.status !== "ativo") {
    const { titulo, mensagem } = BLOQUEIO[user.status];
    const whatsappLider = process.env.ADMIN_WHATSAPP?.replace(/\D/g, "");
    const textoLider =
      user.status === "pendente"
        ? "Olá! Acabei de me cadastrar na ATL Prospect e estou aguardando aprovação."
        : "Olá! Meu acesso à ATL Prospect está bloqueado, pode me ajudar?";

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{titulo}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>{mensagem}</p>
            {whatsappLider && (
              <a
                href={`https://wa.me/${whatsappLider}?text=${encodeURIComponent(textoLider)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm" })}
              >
                Falar com o líder no WhatsApp
              </a>
            )}
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit" className="w-full">
                Sair
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <NavShell role="membro" userEmail={user.email} signOutAction={signOut}>
      {children}
    </NavShell>
  );
}
