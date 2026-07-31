"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-3 pb-2">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground">Acesso à plataforma</p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
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
                autoComplete="current-password"
              />
              <Link
                href="/esqueci-senha"
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                Esqueci minha senha
              </Link>
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Entrando..." : "Entrar"}
            </Button>
            <Link
              href="/cadastro"
              className="text-center text-sm text-muted-foreground underline underline-offset-4"
            >
              Quero me cadastrar
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
