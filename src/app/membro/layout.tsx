import { requireMembro } from "@/lib/auth/guards";
import { signOut } from "@/lib/auth/actions";
import { NavShell } from "@/components/nav-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function MembroLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMembro();

  if (user.status !== "ativo") {
    const mensagem =
      user.status === "pendente"
        ? "Seu cadastro foi recebido e está aguardando aprovação do administrador. Assim que for aprovado, você recebe acesso completo à plataforma."
        : "Seu acesso foi desativado pelo administrador. Se acha que isso é um engano, entre em contato com a equipe.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              {user.status === "pendente" ? "Aguardando aprovação" : "Acesso desativado"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>{mensagem}</p>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">
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
