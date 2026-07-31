"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { solicitarRecuperacaoSenha, type EsqueciSenhaState } from "./actions";

const initialState: EsqueciSenhaState = { error: null, success: false };

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState(solicitarRecuperacaoSenha, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
        </CardHeader>
        <CardContent>
          {state.success ? (
            <div className="flex flex-col gap-3 text-sm">
              <p>
                Se esse e-mail estiver cadastrado, você vai receber um link para redefinir sua
                senha.
              </p>
              <Link href="/login" className="font-medium underline underline-offset-4">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending} className="mt-2">
                {pending ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <Link
                href="/login"
                className="text-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Voltar para o login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
