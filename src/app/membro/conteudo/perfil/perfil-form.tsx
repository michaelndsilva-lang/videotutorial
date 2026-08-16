"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { salvarPerfilConteudo, type PerfilConteudoInput } from "./actions";
import type { TomVozConteudo, NivelExperienciaConteudo } from "@/lib/types/database.types";

const TOM_DE_VOZ_LABEL: Record<TomVozConteudo, string> = {
  inspirador: "Inspirador",
  direto: "Direto",
  descontraido: "Descontraído",
  autoridade: "Autoridade",
};

const NIVEL_EXPERIENCIA_LABEL: Record<NivelExperienciaConteudo, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  lider: "Líder",
};

export function PerfilConteudoForm({
  nomeExibicao: nomeExibicaoInicial,
  whatsapp: whatsappInicial,
  cidade: cidadeInicial,
  publicoAlvo: publicoAlvoInicial,
  tomDeVoz: tomDeVozInicial,
  nivelExperiencia: nivelExperienciaInicial,
  onboardingCompleto: onboardingCompletoInicial,
}: {
  nomeExibicao: string;
  whatsapp: string;
  cidade: string;
  publicoAlvo: string;
  tomDeVoz: TomVozConteudo | "";
  nivelExperiencia: NivelExperienciaConteudo | "";
  onboardingCompleto: boolean;
}) {
  const [nomeExibicao, setNomeExibicao] = useState(nomeExibicaoInicial);
  const [whatsapp, setWhatsapp] = useState(whatsappInicial);
  const [cidade, setCidade] = useState(cidadeInicial);
  const [publicoAlvo, setPublicoAlvo] = useState(publicoAlvoInicial);
  const [tomDeVoz, setTomDeVoz] = useState<TomVozConteudo | "">(tomDeVozInicial);
  const [nivelExperiencia, setNivelExperiencia] = useState<NivelExperienciaConteudo | "">(
    nivelExperienciaInicial
  );
  const [onboardingCompleto, setOnboardingCompleto] = useState(onboardingCompletoInicial);
  const [isPending, startTransition] = useTransition();

  function handleSalvar() {
    const input: PerfilConteudoInput = {
      nomeExibicao,
      whatsapp,
      cidade,
      publicoAlvo,
      tomDeVoz,
      nivelExperiencia,
    };
    startTransition(async () => {
      try {
        const { onboardingCompleto } = await salvarPerfilConteudo(input);
        setOnboardingCompleto(onboardingCompleto);
        toast.success(onboardingCompleto ? "Perfil completo — motor liberado!" : "Perfil salvo.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {onboardingCompleto && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          Perfil completo — o motor de conteúdo está liberado.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome_exibicao">Nome de exibição</Label>
        <Input
          id="nome_exibicao"
          value={nomeExibicao}
          onChange={(e) => setNomeExibicao(e.target.value)}
          placeholder="Como você quer aparecer no conteúdo"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+55 84 90000-0000"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cidade">Cidade</Label>
        <Input
          id="cidade"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Natal/RN"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="publico_alvo">Público que você quer atrair</Label>
        <Textarea
          id="publico_alvo"
          value={publicoAlvo}
          onChange={(e) => setPublicoAlvo(e.target.value)}
          placeholder="Ex.: mães que querem renda extra"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tom_de_voz">Tom de voz</Label>
        <Select
          value={tomDeVoz}
          onValueChange={(value) => setTomDeVoz(value as TomVozConteudo)}
          items={Object.entries(TOM_DE_VOZ_LABEL).map(([value, label]) => ({ value, label }))}
        >
          <SelectTrigger id="tom_de_voz" className="w-full">
            <SelectValue placeholder="Escolha um tom de voz" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TOM_DE_VOZ_LABEL) as TomVozConteudo[]).map((valor) => (
              <SelectItem key={valor} value={valor}>
                {TOM_DE_VOZ_LABEL[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nivel_experiencia">Nível de experiência</Label>
        <Select
          value={nivelExperiencia}
          onValueChange={(value) => setNivelExperiencia(value as NivelExperienciaConteudo)}
          items={Object.entries(NIVEL_EXPERIENCIA_LABEL).map(([value, label]) => ({ value, label }))}
        >
          <SelectTrigger id="nivel_experiencia" className="w-full">
            <SelectValue placeholder="Escolha seu nível" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(NIVEL_EXPERIENCIA_LABEL) as NivelExperienciaConteudo[]).map((valor) => (
              <SelectItem key={valor} value={valor}>
                {NIVEL_EXPERIENCIA_LABEL[valor]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSalvar} disabled={isPending} className="self-start">
        {isPending ? "Salvando..." : "Salvar perfil"}
      </Button>
    </div>
  );
}
