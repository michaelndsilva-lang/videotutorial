import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

const LINK_ROBO = "https://chatgpt.com/g/g-68390258f52c81918bf5a1c7bc9debd0-optimus-protocolos";

// Mesma página para membro e admin; cada rota faz o próprio guard.
export function CriacaoProtocolo() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Ferramenta"
        title="Criação de protocolo"
        description="Um robô que monta protocolos de uso dos nossos suplementos sob medida para cada cliente."
      />
      <Card className="max-w-2xl">
        <CardContent className="flex flex-col gap-4 pt-6 text-sm leading-relaxed">
          <p>
            O robô cria, de forma personalizada, um protocolo de uso dos nossos suplementos: ele indica
            exatamente os produtos que fazem sentido para a necessidade de cada cliente.
          </p>
          <p>
            <strong>Como funciona:</strong> o robô faz algumas perguntas sobre a pessoa que vai receber o
            protocolo. Você responde e ele faz o resto.
          </p>
          <p>
            <strong>Antes de começar:</strong> é preciso ter uma conta no ChatGPT. Pode ser a conta gratuita.
          </p>
          <a
            href={LINK_ROBO}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "mt-2 w-full sm:w-fit sm:px-6")}
          >
            ACESSAR AGORA
            <ExternalLink data-icon="inline-end" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
