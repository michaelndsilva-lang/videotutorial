"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

// O link do e-mail de recuperação chega com os tokens da sessão no hash da URL
// (#access_token=...&refresh_token=...&type=recovery), não em query params —
// o hash nunca é enviado ao servidor, então essa página precisa ser client-side.
type Status = "validando" | "pronto" | "invalido" | "salvo";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<Status>("validando");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    // Limpa o hash da barra de endereço assim que lido, pra não deixar os
    // tokens visíveis/no histórico do navegador.
    window.history.replaceState(null, "", window.location.pathname);

    Promise.resolve().then(async () => {
      if (!accessToken || !refreshToken) {
        setStatus("invalido");
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      setStatus(error ? "invalido" : "pronto");
    });
  }, [supabase]);

  function handleSalvar() {
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsPending(true);
    supabase.auth.updateUser({ password: senha }).then(({ error }) => {
      setIsPending(false);
      if (error) {
        toast.error("Não foi possível salvar a nova senha. Tente novamente.");
        return;
      }
      setStatus("salvo");
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "validando" && (
            <p className="text-sm text-muted-foreground">Validando link...</p>
          )}

          {status === "invalido" && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-destructive">
                Esse link é inválido ou expirou. Solicite um novo link de recuperação.
              </p>
              <Link
                href="/esqueci-senha"
                className="font-medium underline underline-offset-4"
              >
                Solicitar novo link
              </Link>
            </div>
          )}

          {status === "salvo" && (
            <div className="flex flex-col gap-3 text-sm">
              <p>Senha redefinida com sucesso.</p>
              <Button onClick={() => router.push("/login")}>Ir para o login</Button>
            </div>
          )}

          {status === "pronto" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmar_senha">Confirmar nova senha</Label>
                <Input
                  id="confirmar_senha"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSalvar()}
                />
              </div>
              <Button onClick={handleSalvar} disabled={isPending} className="mt-2">
                {isPending ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
