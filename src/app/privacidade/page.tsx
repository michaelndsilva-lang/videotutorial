import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Política de Privacidade · ATL Prospect",
  robots: { index: false, follow: false },
};

// Texto base para os formulários públicos (página pessoal, simulador e
// catálogo). Revisar com o responsável antes de divulgar em larga escala.
export default function PrivacidadePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 text-sm leading-relaxed">
      <Logo size="sm" />
      <h1 className="font-heading text-2xl font-medium tracking-tight">Política de Privacidade</h1>
      <p className="text-muted-foreground">Última atualização: 14 de outubro de 2026.</p>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Quem somos</h2>
        <p>
          A ATL Prospect é a plataforma usada por consultores independentes da Atlântica Natural
          para apresentar produtos, serviços e a oportunidade de negócio. Quando você preenche um
          formulário numa página de consultor, seus dados vão para esse consultor.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Quais dados coletamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nome e número de WhatsApp que você informa.</li>
          <li>O assunto do seu interesse (negócio, energia ou produtos) e, no simulador, o valor da conta e a cidade.</li>
          <li>Data do envio e uma versão embaralhada (hash) do seu endereço IP, usada só para evitar spam.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Para que usamos</h2>
        <p>
          Exclusivamente para o consultor entrar em contato com você pelo WhatsApp sobre o assunto
          que você escolheu. A base legal é o seu consentimento, dado ao marcar a caixa de
          autorização no formulário. Não vendemos nem compartilhamos seus dados com terceiros para
          fins de marketing.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Por quanto tempo guardamos</h2>
        <p>
          Enquanto houver relacionamento com o consultor ou até você pedir a exclusão. O registro
          do seu consentimento pode ser mantido pelo tempo necessário para comprovar que ele foi
          dado.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Seus direitos</h2>
        <p>
          Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode a qualquer momento pedir
          acesso, correção ou exclusão dos seus dados e revogar o consentimento. Basta pedir ao
          consultor que te atendeu, pelo próprio WhatsApp.
        </p>
      </section>
    </main>
  );
}
