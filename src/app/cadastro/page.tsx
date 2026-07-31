"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cadastrar, type CadastroState } from "./actions";

const initialState: CadastroState = { error: null, success: false };

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(cadastrar, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Cadastro de consultor</CardTitle>
        </CardHeader>
        <CardContent>
          {state.success ? (
            <div className="flex flex-col gap-3 text-sm">
              <p>
                Cadastro enviado! Confirme seu e-mail (se solicitado) e aguarde a aprovação do
                administrador para acessar a plataforma.
              </p>
              <Link href="/login" className="font-medium underline underline-offset-4">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nome_completo">Nome completo</Label>
                <Input id="nome_completo" name="nome_completo" required autoComplete="name" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending} className="mt-2">
                {pending ? "Enviando..." : "Cadastrar"}
              </Button>
              <Link
                href="/login"
                className="text-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Já tenho conta
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
