"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { atualizarContaAdmin, alterarSenhaAdmin } from "./actions";

export function ContaForm({ nomeCompleto, email }: { nomeCompleto: string; email: string }) {
  const [nome, setNome] = useState(nomeCompleto);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isSavingNome, startSavingNome] = useTransition();
  const [isSavingSenha, startSavingSenha] = useTransition();

  function handleSalvarNome() {
    startSavingNome(async () => {
      try {
        await atualizarContaAdmin(nome);
        toast.success("Nome atualizado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  function handleAlterarSenha() {
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    startSavingSenha(async () => {
      try {
        await alterarSenhaAdmin(novaSenha);
        setNovaSenha("");
        setConfirmarSenha("");
        toast.success("Senha alterada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={email} disabled autoComplete="off" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome_completo">Nome completo</Label>
          <Input
            id="nome_completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
          />
        </div>
        <Button onClick={handleSalvarNome} disabled={isSavingNome} className="self-start">
          {isSavingNome ? "Salvando..." : "Salvar nome"}
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-foreground">Trocar senha</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nova_senha">Nova senha</Label>
          <Input
            id="nova_senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmar_senha">Confirmar nova senha</Label>
          <Input
            id="confirmar_senha"
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button
          onClick={handleAlterarSenha}
          disabled={isSavingSenha || !novaSenha}
          className="self-start"
          variant="secondary"
        >
          {isSavingSenha ? "Alterando..." : "Alterar senha"}
        </Button>
      </div>
    </div>
  );
}
